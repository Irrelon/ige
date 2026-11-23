import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";

/**
 * Cost of the scene-graph transform pass when most entities haven't changed (a station: 3,600 static
 * entities in nested groups, 450 animated ones). Each frame calls updateTransform() twice per entity,
 * as the engine's update pass and the WebGL renderer's collect pass do.
 *
 * Skipped unless NET_BENCH=1:
 *     NET_BENCH=1 npx jest src/tests/IgeTransformBench.test.ts
 */
const run = process.env.NET_BENCH ? describe : describe.skip;

run("transform pass bench", () => {
	beforeAll(() => {
		Object.defineProperty(ige, "engine", {
			value: { renderer: () => webGlRenderer, _currentTime: 0 },
			configurable: true,
			writable: true
		});
	});

	const webGlRenderer = { classId: "IgeWebGlRenderer" };

	it("measures ms per frame", () => {
		const root = new IgeEntity();
		const all: IgeEntity[] = [];
		const animated: IgeEntity[] = [];
		for (let g = 0; g < 60; g++) {
			const group = new IgeEntity().translateTo(g * 10, 0, 0).mount(root);
			all.push(group);
			for (let s = 0; s < 6; s++) {
				const sub = new IgeEntity().translateTo(0, s * 5, 0).mount(group);
				all.push(sub);
				for (let i = 0; i < 10; i++) {
					all.push(new IgeEntity().translateTo(i, 0, 1).rotateTo(0, 0, i * 0.1).mount(sub));
				}
			}
		}
		// 60 + 360 + 3600 = 4,020 entities; 450 of the leaves animate
		const leaves = all.filter((e) => e._children.length === 0);
		for (let i = 0; i < Number(process.env.BENCH_ANIMATED ?? 450); i++) animated.push(leaves[i * 8]);

		const walk = (e: IgeEntity) => {
			e.updateTransform();
			const c = e._children as IgeEntity[];
			for (let i = c.length - 1; i >= 0; i--) walk(c[i]);
		};
		const frame = (n: number) => {
			for (let i = 0; i < animated.length; i++) {
				const e = animated[i];
				e._translate.x = i + n * 0.01;
				e._rotate.z = n * 0.02;
			}
			walk(root); // engine update pass
			walk(root); // renderer collect pass
		};

		for (let n = 0; n < 60; n++) frame(n);
		const FRAMES = 300;
		const start = performance.now();
		for (let n = 0; n < FRAMES; n++) frame(60 + n);
		const ms = (performance.now() - start) / FRAMES;
		console.log(`entities ${all.length + 1}, animated ${animated.length}: ${ms.toFixed(3)} ms per frame`);
		expect(ms).toBeGreaterThan(0);
	});
});
