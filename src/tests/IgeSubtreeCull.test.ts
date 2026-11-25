import { IgeEntity } from "@/engine/core/IgeEntity";
import { igeAffineInvert, igeAffineMultiply, IgeSubtreeCull, igeSubtreeCullRoots, igeSubtreeOutside, SUBTREE_RETAKE_WALKS } from "@/engine/core/IgeSubtreeCull";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgeFrustum } from "@/engine/webgl/IgeFrustum";
import { IgeWebGlCameraController } from "@/engine/webgl/IgeWebGlCameraController";
import { IgeWebGlGeometryManager } from "@/engine/webgl/IgeWebGlGeometryManager";
import { igeProceduralSkeleton } from "@/engine/webgl/IgeProceduralSkeleton";
import { raycastEntities } from "@/engine/webgl/IgeRaycast";
import { IgeBehaviourType } from "@/enums";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/*
 * Culling an entity with everything under it (IgeEntity.cullSubtree()): the renderer keeps a box round all that's
 * drawn under the entity, in the entity's own space, and leaves the whole subtree out of a frame (not walked) while
 * that box, and the shadow it can cast, is outside every view.
 *
 * The camera here stands at z = 500 looking down -z (60 degrees tall, 800 x 600): at z = 0 it sees x from about -385
 * to 385 and y from -289 to 289.
 */

/** A stand-in WebGL 2 context: every constant is 1, every create* hands back a new token. */
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

/** A cube `half` units each way from its middle (vertices and triangles, for raycasts too). */
function cube (id: string, half: number = 10): IgeGeometryData3d {
	const vertices: number[] = [];
	for (const x of [-half, half]) for (const y of [-half, half]) for (const z of [-half, half]) vertices.push(x, y, z);
	const indices = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
	return { id, vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

const MESH = cube("part");

interface Camera {
	id: () => string;
	_translate: { x: number; y: number; z: number };
	_lookAt: { x: number; y: number; z: number };
	_projectionType: string;
	_fov: number;
	_near: number;
	_far: number;
	_preset: string;
	_scale: { x: number; y: number; z: number };
}

let cameras = 0;
function camera (x: number, y: number, z: number, lookX: number, lookY: number, lookZ: number): Camera {
	const id = `camera${++cameras}`;
	return {
		id: () => id,
		_translate: { x, y, z },
		_lookAt: { x: lookX, y: lookY, z: lookZ },
		_projectionType: "perspective",
		_fov: 60,
		_near: 1,
		_far: 5000,
		_preset: "custom",
		_scale: { x: 1, y: 1, z: 1 }
	};
}

/** The renderer with what collecting a scene needs (no GL drawing): geometry on a stand-in device, a camera controller. */
function makeRenderer (): any {
	const r = new IgeWebGlRenderer() as any;
	const gl = mockGl();
	r._device = new IgeWebGl2GpuDevice(gl);
	r._geometryManager = new IgeWebGlGeometryManager(gl, {} as any, r._device);
	r._cameraController = new IgeWebGlCameraController();
	return r;
}

let r: any;
let scene: IgeEntity;
let views: any[];

beforeEach(() => {
	r = makeRenderer();
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => r, _currentTime: 0 },
		configurable: true,
		writable: true
	});
	scene = new IgeEntity();
	views = [{ _scene: scene, camera: camera(0, 0, 500, 0, 0, 0), _bounds2d: { x: 800, y: 600 }, _translate: { x: 0, y: 0 } }];
});

/** One frame's collection, as renderSceneGraph() does it: the scenes walked, then finished (subtrees decided). */
function frame () {
	r._frameId++;
	r._itemCount = 0;
	r._stats.items = 0;
	r._stats.subtreesCulled = 0;
	r._frameViews = views;
	for (const view of views) r._collectScene(view._scene);
	r._finishScenes();
	return r._sceneData.get(scene);
}

/** The entities drawn (collected) in the last frame. */
function drawn (): Set<IgeEntity> {
	return new Set(r._sceneData.get(scene).models.map((item: { entity: IgeEntity }) => item.entity));
}

/** A group of seven: a root with no mesh of its own, six cube parts round it (40 units out along each axis). */
function group (x: number, y: number, z: number, parent: IgeEntity = scene): { root: IgeEntity; parts: IgeEntity[] } {
	const root = new IgeEntity().translateTo(x, y, z).mount(parent);
	root.cullSubtree(true);
	const parts: IgeEntity[] = [];
	for (const [px, py, pz] of [[40, 0, 0], [-40, 0, 0], [0, 40, 0], [0, -40, 0], [0, 0, 40], [0, 0, -40]]) {
		parts.push(new IgeEntity().geometry(MESH).translateTo(px, py, pz).mount(root));
	}
	return { root, parts };
}

afterEach(() => {
	// (Every root made here is let go, so the count stays true for the next test)
	const roots: IgeEntity[] = [];
	const visit = (o: any) => {
		if (o._subtreeCull) roots.push(o);
		for (const c of o._children) visit(c);
	};
	visit(scene);
	for (const root of roots) root.cullSubtree(false);
	expect(igeSubtreeCullRoots.count).toBe(0);
});

describe("subtree bounds", () => {
	it("are taken in the root's own space as it's walked, and follow it as it moves and turns at no cost", () => {
		const { root } = group(0, 0, 0);
		root.rotateTo(0, Math.PI / 4, 0).scaleTo(2, 2, 2);
		frame();
		const cull = root._subtreeCull!;
		expect(cull.valid).toBe(true);
		expect(cull.volatile).toBe(false);
		// The parts' cubes, 40 out and 10 each way: -50 to 50 on every axis, in the root's space (before its turn and scale)
		for (const v of [cull.minX, cull.minY, cull.minZ]) expect(v).toBeCloseTo(-50, 4);
		for (const v of [cull.maxX, cull.maxY, cull.maxZ]) expect(v).toBeCloseTo(50, 4);
		expect(cull.changedCount).toBe(0);

		// Moved: nothing is noted (the box is in its own space)
		root.translateTo(3000, 0, 0);
		expect(cull.changedCount).toBe(0);
	});

	it("maths: an affine inverse undoes its matrix, and a box is outside a frustum only when wholly beyond one plane", () => {
		const m = new IgeMatrix4().translateBy(10, 20, 30).rotateYBy(0.7).scaleBy(2, 3, 4).matrix;
		const inv = new Float64Array(16);
		expect(igeAffineInvert(m, inv)).toBe(true);
		const id = igeAffineMultiply(new Float64Array(16), inv, m);
		for (let i = 0; i < 16; i++) expect(id[i]).toBeCloseTo(i % 5 === 0 ? 1 : 0, 9);
		expect(igeAffineInvert([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], inv)).toBe(false);

		// A 100-wide orthographic box looking down -z, 200 deep
		const frustum = new IgeFrustum();
		frustum.extractFromMatrix(new IgeMatrix4().orthographic(-50, 50, -50, 50, 0, 200));
		const box = new IgeSubtreeCull();
		box.addSphere(0, 0, 0, 10);
		const at = (x: number, y: number, z: number, turn = 0) => new IgeMatrix4().translateBy(x, y, z).rotateZBy(turn).matrix;
		expect(igeSubtreeOutside(frustum, at(0, 0, -100), box)).toBe(false);
		expect(igeSubtreeOutside(frustum, at(55, 0, -100), box)).toBe(false); // reaches in by 5
		expect(igeSubtreeOutside(frustum, at(65, 0, -100), box)).toBe(true);
		// Turned 45 degrees its corner reaches 14 out: in again
		expect(igeSubtreeOutside(frustum, at(62, 0, -100, Math.PI / 4), box)).toBe(false);
		// Swept along +x from beside the view, or kept out by a margin
		expect(igeSubtreeOutside(frustum, at(-200, 0, -100), box, 0, 1, 0, 0, 0, 200)).toBe(false);
		expect(igeSubtreeOutside(frustum, at(-200, 0, -100), box, 0, -1, 0, 0, 0, 200)).toBe(true);
		expect(igeSubtreeOutside(frustum, at(65, 0, -100), box, 6)).toBe(false);
	});
});

describe("culling a subtree", () => {
	it("draws a group in view, and leaves one out of view out without walking it (after its first walk)", () => {
		const near = group(0, 0, 0);
		const far = group(2000, 0, 0);
		frame(); // first frame: every box is taken
		expect(drawn().has(far.parts[0])).toBe(true);
		frame();
		expect(drawn().has(near.parts[0])).toBe(true);
		expect(drawn().has(far.parts[0])).toBe(false);
		expect(r._stats.subtreesCulled).toBe(1);
		expect(far.root.subtreeCulled()).toBe(true);
		expect(near.root.subtreeCulled()).toBe(false);
		// Not walked: nothing under it is visited
		const visited = new Set<IgeEntity>();
		const collect = r._collectContent;
		r._collectContent = function (obj: IgeEntity, ...rest: unknown[]) {
			visited.add(obj);
			return collect.call(this, obj, ...rest);
		};
		frame();
		expect(visited.has(near.parts[0])).toBe(true);
		expect(visited.has(far.root)).toBe(false);
		expect(far.parts.some((part) => visited.has(part))).toBe(false);
		r._collectContent = collect;
		// Back in view: drawn
		far.root.translateTo(100, 0, 0);
		frame();
		expect(drawn().has(far.parts[0])).toBe(true);
	});

	it("draws a culled group again when one of its parts moves into view, though the root stays out", () => {
		const { root, parts } = group(600, 0, 0);
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		// A part swung out 400 units to the left: now at x = 200, in view
		parts[1].translateTo(-400, 0, 0);
		frame();
		expect(root.subtreeCulled()).toBe(false);
		expect(drawn().has(parts[1])).toBe(true);
		expect(root._subtreeCull!.minX).toBeCloseTo(-410, 4);
	});

	it("draws it when a part is moved in by a preTick behaviour that runs after it in the walk", () => {
		const { root, parts } = group(600, 0, 0);
		const mover = new IgeEntity().mount(scene);
		let swing = false;
		mover.addBehaviour(IgeBehaviourType.preTick, "swing", () => {
			if (swing) parts[2].translateTo(-400, 40, 0);
		});
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		swing = true;
		frame();
		expect(drawn().has(parts[2])).toBe(true);
	});

	it("draws it when a part is mounted or shown in view while it's culled (HLOD nodes come and go this way)", () => {
		const { root, parts } = group(600, 0, 0);
		parts[0].hide();
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		// Shown, 500 to the left of the root: in view
		parts[0].translateTo(-500, 0, 0);
		frame();
		expect(root.subtreeCulled()).toBe(true); // still hidden: nothing changed what's drawn
		parts[0].show();
		frame();
		expect(drawn().has(parts[0])).toBe(true);

		// Moved back: its box, kept while it's drawn, still reaches the view until it's taken afresh (every
		// SUBTREE_RETAKE_WALKS walks), and then it's left out again
		parts[0].translateTo(40, 0, 0);
		frame();
		expect(root.subtreeCulled()).toBe(false);
		let walks = 1;
		while (!root.subtreeCulled() && walks <= SUBTREE_RETAKE_WALKS + 1) {
			frame();
			walks++;
		}
		expect(root.subtreeCulled()).toBe(true);
		expect(walks).toBeLessThanOrEqual(SUBTREE_RETAKE_WALKS + 1);
		const added = new IgeEntity().geometry(MESH).translateTo(-550, 0, 0).mount(root);
		frame();
		expect(drawn().has(added)).toBe(true);
	});

	it("draws a culled group again when a part gets a bigger mesh", () => {
		const { root, parts } = group(600, 0, 0);
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		parts[0].geometry(cube("long", 500));
		frame();
		expect(drawn().has(parts[0])).toBe(true);
	});

	it("draws a group showing in any view (split screen), and nested groups each by their own box", () => {
		views.push({ _scene: scene, camera: camera(2000, 0, 500, 2000, 0, 0), _bounds2d: { x: 800, y: 600 }, _translate: { x: 0, y: 0 } });
		const right = group(2000, 0, 0);
		const outer = group(-2000, 0, 0);
		const inner = group(-1000, 0, 0, outer.root);
		frame();
		frame();
		expect(drawn().has(right.parts[0])).toBe(true);
		expect(outer.root.subtreeCulled()).toBe(true);
		// The inner group (at x = -3000) left in view of nothing; moved into the first view, the outer one is drawn too
		inner.root.translateTo(2000, 0, 0);
		frame();
		expect(outer.root.subtreeCulled()).toBe(false);
		expect(inner.root.subtreeCulled()).toBe(false);
		expect(drawn().has(inner.parts[0])).toBe(true);
		// (Walked with it: each view culls its meshes as usual)
		expect(drawn().has(outer.parts[0])).toBe(true);
	});

	it("never culls what it can't bound without walking: skinned meshes, preTick behaviours, the UI layer", () => {
		const skinned = group(2000, 0, 0);
		const data = igeProceduralSkeleton("body", [{ name: "root" }]);
		new IgeEntity().skin(cube("skin"), data).mount(skinned.root);
		const ticking = group(2200, 0, 0);
		let ticks = 0;
		ticking.parts[0].addBehaviour(IgeBehaviourType.preTick, "tick", () => ticks++);
		const labelled = group(2400, 0, 0);
		new IgeEntity().uiLayer(1).mount(labelled.root);
		for (let i = 0; i < 3; i++) frame();
		expect(skinned.root._subtreeCull!.volatile).toBe(true);
		expect(ticking.root._subtreeCull!.volatile).toBe(true);
		expect(labelled.root._subtreeCull!.volatile).toBe(true);
		expect(r._stats.subtreesCulled).toBe(0);
		expect(ticks).toBe(3);
		expect(drawn().has(skinned.parts[0])).toBe(true);
	});

	it("walks a culled group again, every frame, once a part follows a bone or is given a skin", () => {
		for (const change of [(part: IgeEntity) => part.attachToBone("root"), (part: IgeEntity) => part.skin(cube("skinNow"), igeProceduralSkeleton("now", [{ name: "root" }]))]) {
			const { root, parts } = group(2000, 0, 0);
			frame();
			frame();
			expect(root.subtreeCulled()).toBe(true);
			change(parts[0]);
			frame();
			frame();
			expect(root.subtreeCulled()).toBe(false);
			expect(root._subtreeCull!.volatile).toBe(true);
			root.destroy();
		}
	});

	it("draws a huge ground under a root whose middle is far out of view", () => {
		const root = new IgeEntity().translateTo(5000, -100, 0).mount(scene).cullSubtree(true);
		const ground = new IgeEntity().geometry(cube("ground", 6000)).scaleTo(1, 0.001, 1).mount(root);
		frame();
		frame();
		expect(drawn().has(ground)).toBe(true);
	});

	it("leaves out a group with nothing drawn under it, and draws it once something is", () => {
		const root = new IgeEntity().translateTo(0, 0, 0).mount(scene).cullSubtree(true);
		const empty = new IgeEntity().mount(root);
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		empty.geometry(MESH);
		frame();
		expect(drawn().has(empty)).toBe(true);
	});

	it("keeps a culled group's box in the heights that can take a shadow", () => {
		new IgeEntity().geometry(cube("floor", 100)).mount(scene);
		const low = group(3000, -1000, 0);
		frame();
		const data = frame();
		expect(low.root.subtreeCulled()).toBe(true);
		expect(data.minY).toBeCloseTo(-1050, 4);
		expect(data.maxY).toBeCloseTo(100, 4);
	});

	it("leaves raycasts alone: they walk the scene themselves and hit what's under a culled group", () => {
		const { root, parts } = group(2000, 0, 0);
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(true);
		const hit = raycastEntities({ origin: { x: 2040, y: 0, z: 500 }, direction: { x: 0, y: 0, z: -1 } }, scene)[0];
		expect(hit?.entity).toBe(parts[0]);
	});

	it("costs nothing while no entity is culled that way: moves note nothing", () => {
		const plain = new IgeEntity().mount(scene);
		const child = new IgeEntity().geometry(MESH).mount(plain);
		frame();
		expect(igeSubtreeCullRoots.count).toBe(0);
		child.translateTo(10, 0, 0);
		expect(child._subtreeStamp).toBe(0);
	});
});

describe("culling a subtree with shadows", () => {
	beforeEach(() => {
		// A sun from up and to the left (travelling +x and down), over a floor at y = -100
		r._shadowManager = { enabled: () => true, frustumSize: () => 400, getPointShadowMapData: () => null };
		r._shadowCastingLight = { direction: () => ({ x: Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 }) };
		new IgeEntity().geometry(cube("floor", 3000)).scaleTo(1, 0.001, 1).translateTo(0, -100, 0).mount(scene);
	});

	it("draws a caster outside the view whose shadow falls into it, and leaves out one whose shadow can't", () => {
		// Left of the view, 250 up: its shadow runs 350 right on the way down to the floor, into view
		const left = group(-600, 200, 0);
		// Right of the view: its shadow runs further right
		const right = group(700, 200, 0);
		frame();
		frame();
		expect(left.root.subtreeCulled()).toBe(false);
		expect(drawn().has(left.parts[0])).toBe(true);
		expect(right.root.subtreeCulled()).toBe(true);
		// (It's its shadow that keeps it: without shadows it's left out)
		const light = r._shadowCastingLight;
		r._shadowCastingLight = undefined;
		frame();
		expect(left.root.subtreeCulled()).toBe(true);
		r._shadowCastingLight = light;
		frame();
		expect(left.root.subtreeCulled()).toBe(false);
		// Far to the left, its shadow lands short of the view
		left.root.translateTo(-3000, 200, 0);
		frame();
		expect(left.root.subtreeCulled()).toBe(true);
	});

	it("draws a group in reach of a shadow-casting point light, wherever it is", () => {
		const { root } = group(2000, 0, 0);
		r._shadowCastingPointLights = [{ id: () => "lamp", _translate: { x: 2000, y: 300, z: 0 }, _range: 400 }];
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(false);
		r._shadowCastingPointLights = [{ id: () => "lamp", _translate: { x: -2000, y: 300, z: 0 }, _range: 400 }];
		frame();
		expect(root.subtreeCulled()).toBe(true);
	});

	it("draws everything when the light comes from below (its shadows can't be followed down to a floor)", () => {
		r._shadowCastingLight = { direction: () => ({ x: 0, y: 1, z: 0 }) };
		const { root } = group(2000, 0, 0);
		frame();
		frame();
		expect(root.subtreeCulled()).toBe(false);
	});
});
