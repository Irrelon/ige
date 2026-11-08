import { DT, random, SCENES } from "./scenes.js";
import { createJolt } from "./adapters/jolt.js";
import { createRapier } from "./adapters/rapier.js";
import { createPhysX } from "./adapters/physx.js";

export const ENGINES = {
	jolt: () => createJolt("single"),
	"jolt-debug": () => createJolt("debug"),
	"jolt-mt": () => createJolt("multi"),
	rapier: () => createRapier("plain"),
	"rapier-simd": () => createRapier("simd"),
	physx: () => createPhysX()
};

function stats (samples) {
	const sorted = [...samples].sort((a, b) => a - b);
	const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
	const mean = samples.reduce((s, v) => s + v, 0) / Math.max(1, samples.length);
	return { mean: +mean.toFixed(3), p50: +pick(0.5).toFixed(3), p95: +pick(0.95).toFixed(3), max: +sorted[sorted.length - 1].toFixed(3) };
}

/** Run one scene on one engine and return its timings and sanity checks. */
export async function runOne (engineId, sceneId) {
	const scene = SCENES[sceneId];
	const loadStart = performance.now();
	const a = await ENGINES[engineId]();
	const loadMs = performance.now() - loadStart;

	const rand = random(1234);
	const setupStart = performance.now();
	a.createWorld(DT);
	const state = scene.setup(a, rand);
	const setupMs = performance.now() - setupStart;

	const stepTimes = [], apiTimes = [], rayTimes = [];
	let rayHits = 0;
	const rayRand = random(99);
	for (let step = 0; step < scene.steps; step++) {
		if (scene.update) {
			const t0 = performance.now();
			scene.update(a, state, step);
			apiTimes.push(performance.now() - t0);
		}
		const t1 = performance.now();
		a.step(DT);
		stepTimes.push(performance.now() - t1);

		if (scene.rays) {
			const t2 = performance.now();
			for (let r = 0; r < scene.rays; r++) {
				const angle = rayRand() * Math.PI * 2;
				if (a.raycast((rayRand() - 0.5) * 50, 1, (rayRand() - 0.5) * 50, Math.cos(angle), 0, Math.sin(angle), 20)) rayHits++;
			}
			rayTimes.push(performance.now() - t2);
		}
	}

	const result = {
		engine: a.name,
		engineId,
		version: a.version,
		scene: sceneId,
		loadMs: +loadMs.toFixed(1),
		setupMs: +setupMs.toFixed(1),
		step: stats(stepTimes.slice(10)),
		// The first 10 steps (contact cache warm-up, JIT) are reported apart
		firstSteps: +stepTimes.slice(0, 10).reduce((s, v) => s + v, 0).toFixed(2),
		api: apiTimes.length ? stats(apiTimes) : null,
		rays: rayTimes.length ? { ...stats(rayTimes), hitRate: +(rayHits / (scene.rays * scene.steps)).toFixed(3) } : null,
		check: scene.check ? scene.check(a, state) : null,
		crossOriginIsolated: globalThis.crossOriginIsolated === true
	};
	a.destroyWorld();
	return result;
}
