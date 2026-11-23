import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";

/**
 * updateTransform() skips an entity whose transform inputs haven't been written (dirty flag) and
 * whose parent hasn't changed. Every scenario here checks the matrices that come out of the normal
 * update against matrices from a forced full rebuild of the same tree.
 */
let webGl = true;
const webGlRenderer = { classId: "IgeWebGlRenderer" };
const canvasRenderer = { classId: "IgeCanvas2dRenderer" };

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => (webGl ? webGlRenderer : canvasRenderer), _currentTime: 0 },
		configurable: true,
		writable: true
	});
});

beforeEach(() => {
	webGl = true;
});

function walk (e: IgeEntity, fn: (e: IgeEntity) => void) {
	fn(e);
	for (const c of e._children as IgeEntity[]) walk(c, fn);
}

function snapshot (root: IgeEntity) {
	const out: number[][] = [];
	walk(root, (e) => {
		out.push(Array.from(e._worldMatrix.matrix));
		if (e._worldMatrix4) out.push(Array.from(e._worldMatrix4.matrix));
	});
	return out;
}

function update (root: IgeEntity) {
	walk(root, (e) => e.updateTransform());
}

/** Runs the normal update, then a forced rebuild of everything, and compares them. */
function expectSameAsRebuild (root: IgeEntity) {
	update(root);
	const normal = snapshot(root);
	walk(root, (e) => { e._tfInputs = undefined; });
	update(root);
	const rebuilt = snapshot(root);
	expect(normal).toEqual(rebuilt);
}

function makeTree () {
	const root = new IgeEntity().translateTo(5, 6, 7);
	const group = new IgeEntity().translateTo(10, 0, 0).rotateTo(0, 0, 0.5).mount(root);
	const a = new IgeEntity().translateTo(1, 2, 3).mount(group);
	const b = new IgeEntity().translateTo(-4, 5, 6).scaleTo(2, 2, 2).mount(group);
	update(root);
	return { root, group, a, b };
}

describe("transform dirty tracking", () => {
	it("leaves a static tree alone: no rebuilds, versions unchanged", () => {
		const { root, group, a } = makeTree();
		expect(a._tfDirty).toBe(false);
		const versions = [root._transformVersion, group._transformVersion, a._transformVersion];
		const matrix = a._worldMatrix.matrix.slice();
		for (let i = 0; i < 5; i++) update(root);
		expect([root._transformVersion, group._transformVersion, a._transformVersion]).toEqual(versions);
		expect(Array.from(a._worldMatrix.matrix)).toEqual(Array.from(matrix));
		expect(a._transformChanged).toBe(false);
		expectSameAsRebuild(root);
	});

	it("follows a moved child without touching its sibling", () => {
		const { root, a, b } = makeTree();
		const bVersion = b._transformVersion;
		a.translateBy(3, 0, 0);
		expect(a._tfDirty).toBe(true);
		expectSameAsRebuild(root);
		expect(b._transformVersion).toBe(bVersion);
	});

	it("moves children when the parent moves", () => {
		const { root, group, a, b } = makeTree();
		const before = Array.from(a._worldMatrix4!.matrix);
		group.translateTo(50, 60, 70);
		update(root);
		expect(Array.from(a._worldMatrix4!.matrix)).not.toEqual(before);
		expectSameAsRebuild(root);
		group.rotateTo(0.1, 0.2, 0.3).scaleTo(2, 3, 4);
		expectSameAsRebuild(root);
		expect(b._transformChanged).toBe(false);
	});

	it("moves the whole tree when the root moves", () => {
		const { root } = makeTree();
		root.translateTo(-100, 40, 0);
		expectSameAsRebuild(root);
	});

	it.each([
		["translate", (e: IgeEntity) => { e._translate.x = 33; }],
		["translate y", (e: IgeEntity) => { e._translate.y += 4; }],
		["translate z", (e: IgeEntity) => { e._translate.z = 9; }],
		["rotate", (e: IgeEntity) => { e._rotate.z = 1.1; }],
		["rotate x", (e: IgeEntity) => { e._rotate.x = 0.4; }],
		["scale", (e: IgeEntity) => { e._scale.x = 3; }],
		["origin", (e: IgeEntity) => { e._origin.x = 0; }],
		["bounds2d", (e: IgeEntity) => { e._bounds2d.x = 99; e._origin.y = 0.1; }],
		["bounds3d", (e: IgeEntity) => { e._bounds3d.z = 17; e._origin.z = 0; }],
		["bounds2d replaced", (e: IgeEntity) => { e._bounds2d = new IgePoint2d(70, 80); e._origin.x = 0.2; }],
		["bounds3d replaced", (e: IgeEntity) => { e._bounds3d = new IgePoint3d(10, 10, 10); e._origin.z = 0.9; }]
	])("notices a direct write to %s", (_name, write) => {
		for (const mode of [true, false]) {
			webGl = mode;
			const { root, group, a, b } = makeTree();
			write(a);
			expectSameAsRebuild(root);
			write(group);
			expectSameAsRebuild(root);
			// Writing the same values again changes nothing and costs no rebuild
			update(root);
			expect(b._tfDirty).toBe(false);
		}
	});

	it("rebuilds children when a parent's 3d bounds change in iso mode", () => {
		const root = new IgeEntity();
		const parent = new IgeEntity().isometric(true).mount(root);
		const child = new IgeEntity().isometric(true).translateTo(1, 1, 0).mount(parent);
		update(root);
		parent._bounds3d.z = 40;
		expectSameAsRebuild(root);
		expect(child._worldMatrix.matrix[5]).toBeGreaterThan(0);
	});

	it("notices a direct _renderMode write", () => {
		const { root, a } = makeTree();
		a._translate.x = 20;
		update(root);
		a._renderMode = 1;
		expectSameAsRebuild(root);
	});

	it("handles re-mounting and unmounting", () => {
		const { root, group, a, b } = makeTree();
		a.mount(root);
		expectSameAsRebuild(root);
		a.mount(b);
		expectSameAsRebuild(root);
		group.translateTo(0, 0, 0);
		expectSameAsRebuild(root);
		a.unMount();
		update(a);
		expect(a._parent).toBeNull();
		const lone = new IgeEntity().translateTo(1, 1, 1);
		update(lone);
		lone.mount(group);
		expectSameAsRebuild(root);
	});

	it("handles quaternions, including edits made in place", () => {
		const { root, a } = makeTree();
		a.quaternion({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 });
		expectSameAsRebuild(root);
		const q = a.quaternion()!;
		q.x = Math.SQRT1_2; q.z = 0;
		expectSameAsRebuild(root);
		a.quaternion(null);
		expectSameAsRebuild(root);
	});

	it("handles attachToBone being set and cleared", () => {
		const { root, a } = makeTree();
		a.attachToBone("RightHand");
		expectSameAsRebuild(root);
		a._translate.x = 77;
		expectSameAsRebuild(root);
		a.attachToBone(null);
		expectSameAsRebuild(root);
	});

	it("rebuilds after the world matrix is altered by localToWorld's adjustment matrix", () => {
		const { root, a } = makeTree();
		a._adjustmentMatrix = new (a._worldMatrix.constructor as any)().translateBy(5, 5);
		a.localToWorld([new IgePoint3d(0, 0, 0)]);
		expect(a._tfDirty).toBe(true);
		expectSameAsRebuild(root);
	});

	it("follows the renderer: switching renderer type rebuilds, and the lookup is cached", () => {
		const { root, a } = makeTree();
		expect(a._worldMatrix4).toBeDefined();
		webGl = false;
		update(root);
		expect(a._tfWebGl).toBe(false);
		a._translate.x = 3;
		expectSameAsRebuild(root);
		webGl = true;
		update(root);
		expect(a._tfWebGl).toBe(true);
		expectSameAsRebuild(root);
	});

	it("keeps velocity-driven movement working", () => {
		const { root, a } = makeTree();
		a._translate.x += 5; // what update() does for a velocity
		expectSameAsRebuild(root);
	});
});
