import { synthWorkerMain } from "./musicSynth";
import { titleScore } from "./music";
import { type Track, trackScore, TRACKS } from "./tracks";
import type { Score } from "./score";

import { writeFileSync } from "fs";

/** Render a whole score offline with the worker's synthesiser (run here, in Node). */
function render (score: Score, length: number, reverb: number, wav?: { path: string; gain: number }): { rms: number; peak: number; seconds: number } {
	let out: { left: Float32Array; right: Float32Array } | null = null;
	const scope = globalThis as unknown as { self: unknown };
	const fake = { onmessage: null as ((e: { data: unknown }) => void) | null, postMessage: (m: { left?: Float32Array; right?: Float32Array }) => { if (m.left && m.right) out = { left: m.left, right: m.right }; } };
	scope.self = fake;
	synthWorkerMain();
	fake.onmessage!({ data: { id: 1, sr: 32000, length, reverb, events: score.events } });
	const { left, right } = out!;
	if (wav) {
		// 16-bit stereo WAV at the playback gain (for listening outside the game)
		const n = left.length, data = Buffer.alloc(44 + n * 4);
		data.write("RIFF", 0); data.writeUInt32LE(36 + n * 4, 4); data.write("WAVEfmt ", 8);
		data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(32000, 24);
		data.writeUInt32LE(128000, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(n * 4, 40);
		const clip = (x: number) => Math.round(Math.max(-1, Math.min(1, Math.tanh(x * wav.gain))) * 32767);
		for (let i = 0; i < n; i++) {
			data.writeInt16LE(clip(left[i]), 44 + i * 4);
			data.writeInt16LE(clip(right[i]), 46 + i * 4);
		}
		writeFileSync(wav.path, data);
	}
	let sum = 0, peak = 0;
	for (let i = 0; i < left.length; i++) {
		sum += left[i] * left[i] + right[i] * right[i];
		peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
	}
	return { rms: Math.sqrt(sum / (2 * left.length)), peak, seconds: left.length / 32000 };
}

describe("in-game music", () => {
	test("eight tracks; every bar of every tune is four beats and every chord is known", () => {
		expect(TRACKS.length).toBe(8);
		for (const t of TRACKS) {
			for (const sec of t.sections) {
				const bars = sec.chords.trim().split(/\s+/).length;
				if (!sec.melody) continue;
				const tune = sec.melody.split("|");
				expect(tune.length).toBe(bars);
				for (const bar of tune) {
					const beats = bar.trim().split(/\s+/).reduce((n, tok) => n + Number(tok.split(":")[1]), 0);
					if (beats !== 4) throw new Error(`${t.name}: a bar of ${beats} beats: ${bar}`);
				}
			}
			expect(() => trackScore(t)).not.toThrow();
		}
	});

	test("loudness (for setting levels)", () => {
		if (!process.env.MUSIC_LEVELS) return;
		const title = titleScore();
		const ref = render(title.score, title.length, 0.3);
		const rows = [`title: ${ref.seconds.toFixed(0)} s, rms ${ref.rms.toFixed(4)}, peak ${ref.peak.toFixed(3)}`];
		for (const t of TRACKS as Track[]) {
			const built = trackScore(t);
			const dir = process.env.MUSIC_WAV;
			const r = render(built.score, built.length, t.reverb, dir ? { path: `${dir}/${TRACKS.indexOf(t) + 1} ${t.name}.wav`, gain: t.level * 0.85 } : undefined);
			rows.push(`${t.name}: ${r.seconds.toFixed(0)} s, ${built.score.events.length} notes, rms ${r.rms.toFixed(4)}, peak ${r.peak.toFixed(3)}, level for 0.55 x title: ${(0.55 * ref.rms / r.rms).toFixed(2)}`);
		}
		console.log(rows.join("\n"));
	}, 600000);
});
