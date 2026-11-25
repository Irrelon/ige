import { SUBTREE_BENCH_MODES, subtreeCullBench } from "./support/subtreeCullBench";

/**
 * What culling a subtree as one (IgeEntity.cullSubtree()) saves the WebGL renderer's walk: 300 vehicles of seven
 * entities each (a root, a body, four wheels and a light bar), driving about a city 40,000 units square, the camera at
 * street level seeing about a sixth of them, with a sun's shadows. Each frame every vehicle moves and turns and every
 * wheel spins, as a game's traffic does; the engine's update pass (updateTransform() on every entity) is timed apart,
 * as this doesn't change it. The walk is the renderer's collect and finish (the scene turned into render items,
 * subtrees decided), without the GL drawing. The scene is in support/subtreeCullBench.ts, which can also run in plain
 * Node (jest's realm makes each Math call cost about 100 ns, which the renderer's own per-item code pays too).
 *
 * Skipped unless NET_BENCH=1 (BENCH_MODE picks a mode by its name, or modes by how their names start):
 *     NET_BENCH=1 npx jest src/tests/IgeSubtreeCullBench.test.ts
 */
const run = process.env.NET_BENCH ? describe : describe.skip;

run("culling subtrees bench", () => {
	it("measures ms per frame with and without", () => {
		const wanted = process.env.BENCH_MODE;
		const exact = SUBTREE_BENCH_MODES.filter((m) => m === wanted);
		const rows = subtreeCullBench(!wanted ? SUBTREE_BENCH_MODES : exact.length ? exact : SUBTREE_BENCH_MODES.filter((m) => m.startsWith(wanted)));
		console.log(`300 vehicles x 7 entities, a frame:\n${rows.join("\n")}`);
	});
});
