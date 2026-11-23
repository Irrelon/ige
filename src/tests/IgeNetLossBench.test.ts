import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";

/**
 * How fresh a moving object stays at the client under packet loss: reliable-ordered (a WebSocket,
 * TCP: a lost packet holds back everything behind it until it's resent) against lossy (WebTransport
 * datagrams: a lost packet is simply skipped and the next carries the change). 60 ms round trip,
 * 30 updates a second, 120 s of play per cell, on the loopback transport (`tcp` mode models the
 * head-of-line blocking: a lost message arrives after RTT + 200 ms and holds back all behind it).
 *
 * Skipped unless NET_BENCH=1:
 *     NET_BENCH=1 npx jest --runTestsByPath src/tests/IgeNetLossBench.test.ts
 * Prints, per loss rate, the gap between fresh updates of the object at the client (p50 / p95 / p99
 * and the longest freeze, in ms).
 */
const run = process.env.NET_BENCH ? describe : describe.skip;

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	ship: { x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, heading: { type: "angle", bits: 9 } }
};
const inputDefs: Record<string, IgeNetFieldDef> = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } };
const TICK = 30;
const SECONDS = Number(process.env.NET_BENCH_SECONDS ?? 120);
const LOSSES = (process.env.NET_BENCH_LOSS ?? "0,0.01,0.02,0.05").split(",").map(Number);

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))];

async function measure (mode: "reliable" | "lossy", loss: number): Promise<{ gaps: number[]; ages: number[] }> {
	let seed = 7 + Math.round(loss * 1000);
	const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
	const net = igeNetLoopback(mode === "reliable" ? { latency: 30, loss, tcp: true } : { latency: 30, loss, lossy: true });
	const host = new IgeNetReplicationHost<{ thrust: number }>(net.listener, {
		schemas: defs,
		inputSchema: inputDefs,
		tickRate: TICK,
		sendRate: TICK,
		join: (machine) => {
			machine.viewer.subscribe("w");
			host.replicator.create("ship", "s", { x: 0, y: 0, heading: 0 }, { scope: "w" });
			return ["p"];
		},
		step: (_dt, tick) => {
			host.replicator.get("s")!.write({ x: tick * 0.5, y: Math.sin(tick / 20) * 50, heading: (tick / 30) % (Math.PI * 2) });
		}
	});
	const client = new IgeNetReplicationClient<{ thrust: number }>(net.connect(), { schemas: defs, inputSchema: inputDefs, pingInterval: 0, now: () => Date.now() });
	const arrivals: number[] = [];
	let lastX = -1;
	client.on("snapshot", () => {
		const x = client.latest("s")?.x as number | undefined;
		if (x !== undefined && x !== lastX) {
			lastX = x;
			arrivals.push(Date.now());
		}
	});
	const joined = client.join([{}]);
	let welcomed = false;
	joined.then(() => { welcomed = true; });
	while (!welcomed) await jest.advanceTimersByTimeAsync(50);
	for (let i = 0; i < SECONDS * TICK; i++) {
		client.sendInput([{ thrust: 1 }]);
		host.update(1000 / TICK);
		await jest.advanceTimersByTimeAsync(1000 / TICK);
	}
	host.destroy();
	client.destroy();
	spy.mockRestore();
	const gaps: number[] = [];
	for (let i = 1; i < arrivals.length; i++) gaps.push(arrivals[i] - arrivals[i - 1]);
	// What a renderer sees: how long since the last fresh update, at every millisecond
	const ages: number[] = [];
	for (const gap of gaps) for (let age = 0; age < gap; age++) ages.push(age);
	return { gaps: gaps.sort((a, b) => a - b), ages: ages.sort((a, b) => a - b) };
}

run("freshness of a moving object under loss (60 ms round trip)", () => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	it("prints the gaps between fresh updates", async () => {
		const gapRows: string[] = ["Gap between fresh updates at the client (ms)", "loss   transport                  p50    p95    p99    longest"];
		const ageRows: string[] = ["Time since the last fresh update, sampled every ms (what a renderer sees; ms)", "loss   transport                  p50    p95    p99    longest freeze"];
		const results: Record<string, { gaps: number[]; ages: number[] }[]> = { reliable: [], lossy: [] };
		const cell = (values: number[]) => `${[50, 95, 99].map((p) => String(Math.round(percentile(values, p))).padStart(5)).join("  ")}  ${String(Math.round(values[values.length - 1])).padStart(8)}`;
		for (const loss of LOSSES) {
			for (const mode of ["reliable", "lossy"] as const) {
				const result = await measure(mode, loss);
				results[mode].push(result);
				const label = `${String(loss * 100).padStart(3)}%   ${(mode === "reliable" ? "WebSocket (TCP, ordered)" : "WebTransport (datagrams)").padEnd(26)}`;
				gapRows.push(`${label}${cell(result.gaps)}`);
				ageRows.push(`${label}${cell(result.ages)}`);
			}
		}
		console.log(`\n${gapRows.join("\n")}\n\n${ageRows.join("\n")}\n`);
		// At 5% loss the datagram path must keep fresher than waiting behind retransmits
		const five = LOSSES.indexOf(0.05);
		if (five >= 0) expect(percentile(results.lossy[five].ages, 99)).toBeLessThan(percentile(results.reliable[five].ages, 99));
	}, 600000);
});
