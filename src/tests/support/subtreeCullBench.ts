import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IgeWebGlCameraController } from "@/engine/webgl/IgeWebGlCameraController";
import { IgeWebGlGeometryManager } from "@/engine/webgl/IgeWebGlGeometryManager";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/*
 * The scene and frames of IgeSubtreeCullBench.test.ts (see there). It needs nothing of jest, so a copy compiled to
 * CommonJS (tsc with `module: commonjs`, `@/` mapped to the output folder) can run in plain Node and call
 * printSubtreeCullBench(): jest runs tests in a separate realm, where every global (Math included) is looked up the
 * slow way, about 100 ns a call, which inflates every mode's times.
 */

function mockGl (): WebGL2RenderingContext {
	let n = 0;
	return new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4096;
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
}

function box (id: string, hx: number, hy: number, hz: number): IgeGeometryData3d {
	const vertices: number[] = [];
	for (const x of [-hx, hx]) for (const y of [-hy, hy]) for (const z of [-hz, hz]) vertices.push(x, y, z);
	const indices = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
	return { id, vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export type Mode = "off" | "cullSubtree" | "cullSubtree, wheels posed only when drawn" | "hidden by the game (the old workaround)";

export const SUBTREE_BENCH_MODES: Mode[] = ["off", "cullSubtree", "cullSubtree, wheels posed only when drawn", "hidden by the game (the old workaround)"];

/** Each mode's frame: ms of the renderer's walk and of the update pass, and what was drawn. */
export function subtreeCullBench (modes: Mode[] = SUBTREE_BENCH_MODES): string[] {
	const rows: string[] = [];
	for (const mode of modes) {
		const r = new IgeWebGlRenderer() as any;
		const gl = mockGl();
		r._device = new IgeWebGl2GpuDevice(gl);
		r._geometryManager = new IgeWebGlGeometryManager(gl, {} as any, r._device);
		r._cameraController = new IgeWebGlCameraController();
		r._shadowManager = { enabled: () => true, frustumSize: () => 4000, getPointShadowMapData: () => null };
		r._shadowCastingLight = { direction: () => ({ x: -0.48, y: -0.78, z: -0.4 }) };
		Object.defineProperty(ige, "engine", { value: { renderer: () => r, _currentTime: 0 }, configurable: true, writable: true });

		const scene = new IgeEntity();
		new IgeEntity().geometry(box("ground", 20000, 1, 20000)).translateTo(0, -1, 0).mount(scene);
		const camera = {
			id: () => `camera-${mode}`,
			// (BENCH_VIEW=all: from high above, every vehicle in view, for what culling costs when it saves nothing)
			_translate: process.env.BENCH_VIEW === "all" ? { x: 0, y: 60000, z: 1 } : { x: 0, y: 170, z: 0 },
			_lookAt: process.env.BENCH_VIEW === "all" ? { x: 0, y: 0, z: 0 } : { x: 1000, y: 150, z: 300 },
			_projectionType: "perspective", _fov: 60, _near: 10, _far: process.env.BENCH_VIEW === "all" ? 100000 : 18000, _preset: "custom",
			_scale: { x: 1, y: 1, z: 1 }
		};
		const views = [{ _scene: scene, camera, _bounds2d: { x: 1440, y: 900 }, _translate: { x: 0, y: 0 } }];

		const bodyMesh = box("body", 220, 70, 90), wheelMesh = box("wheel", 35, 35, 12), barMesh = box("bar", 60, 8, 20);
		const vehicles: { root: IgeEntity; wheels: IgeEntity[]; x: number; z: number; heading: number }[] = [];
		let seed = 7;
		const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		for (let i = 0; i < 300; i++) {
			const x = (random() - 0.5) * 40000, z = (random() - 0.5) * 40000, heading = random() * Math.PI * 2;
			const root = new IgeEntity().translateTo(x, 0, z).mount(scene);
			if (mode !== "off" && !mode.startsWith("hidden")) root.cullSubtree(true);
			new IgeEntity().geometry(bodyMesh).translateTo(0, 105, 0).mount(root);
			const wheels: IgeEntity[] = [];
			for (const [wx, wz] of [[150, 80], [150, -80], [-150, 80], [-150, -80]]) {
				wheels.push(new IgeEntity().geometry(wheelMesh).translateTo(wx, 35, wz).mount(root));
			}
			new IgeEntity().geometry(barMesh).translateTo(0, 185, 0).mount(root);
			vehicles.push({ root, wheels, x, z, heading });
		}

		const all: IgeEntity[] = [];
		const gather = (e: IgeEntity) => {
			all.push(e);
			for (const c of e._children as IgeEntity[]) gather(c);
		};
		gather(scene);
		// What the game did: a vehicle out of view (its sphere, and the shadow it casts, outside the frustum) is hidden
		const hideOutOfView = () => {
			const frustum = r._cameraController.updateCamera(camera, views[0]).frustum;
			for (const v of vehicles) {
				const t = v.root._translate;
				const seen = frustum.sweptSphereVisibleXYZ(t.x, t.y + 100, t.z, 300, -0.48, -0.78, -0.4, 400);
				if (seen) v.root.show();
				else v.root.hide();
			}
		};

		let drawnVehicles = 0;
		const frame = (n: number, timing: { update: number; walk: number }) => {
			// The game: traffic moves and turns, wheels spin (posed only when drawn, in that mode)
			for (const v of vehicles) {
				v.heading += 0.002;
				v.x += Math.cos(v.heading) * 15;
				v.z += Math.sin(v.heading) * 15;
				v.root.translateTo(v.x, 0, v.z).rotateTo(0, -v.heading, 0);
				if (mode === "cullSubtree, wheels posed only when drawn" && v.root.subtreeCulled()) continue;
				if (mode.startsWith("hidden") && v.root._hidden) continue;
				for (const wheel of v.wheels) wheel.rotateTo(0, 0, -n * 0.3);
			}
			if (mode.startsWith("hidden")) hideOutOfView();
			// The engine's update pass: every entity's transform
			const t0 = performance.now();
			for (let i = 0; i < all.length; i++) all[i].updateTransform();
			const t1 = performance.now();
			// The renderer's walk
			r._frameId++;
			r._itemCount = 0;
			r._stats.items = 0;
			r._stats.subtreesCulled = 0;
			r._frameViews = views;
			r._collectScene(scene);
			r._finishScenes();
			const t2 = performance.now();
			timing.update += t1 - t0;
			timing.walk += t2 - t1;
			drawnVehicles = new Set(r._sceneData.get(scene).models.map((item: any) => item.entity._parent)).size - 1;
		};

		const warm = { update: 0, walk: 0 };
		for (let n = 0; n < 120; n++) frame(n, warm);
		const FRAMES = 600;
		const timing = { update: 0, walk: 0 };
		for (let n = 120; n < 120 + FRAMES; n++) frame(n, timing);
		const items = r._stats.items;
		rows.push(
			`${mode.padEnd(42)} walk ${(timing.walk / FRAMES).toFixed(3)} ms, update pass ${(timing.update / FRAMES).toFixed(3)} ms; ` +
			`${items} items, ${drawnVehicles} vehicles walked, ${r._stats.subtreesCulled} culled as one`
		);
		for (const v of vehicles) v.root.cullSubtree(false);
	}
	return rows;
}

/** Prints each mode's frame (BENCH_MODE picks modes by how their names start). */
export function printSubtreeCullBench (): void {
	const wanted = process.env.BENCH_MODE;
	const exact = SUBTREE_BENCH_MODES.filter((m) => m === wanted);
	const rows = subtreeCullBench(!wanted ? SUBTREE_BENCH_MODES : exact.length ? exact : SUBTREE_BENCH_MODES.filter((m) => m.startsWith(wanted)));
	console.log(`300 vehicles x 7 entities, a frame:\n${rows.join("\n")}`);
}
