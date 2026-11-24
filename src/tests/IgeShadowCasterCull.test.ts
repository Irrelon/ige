import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgeFrustum } from "@/engine/webgl/IgeFrustum";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import { igeProceduralSkeleton, igeSetBonePose } from "@/engine/webgl/IgeProceduralSkeleton";
import { IgeShadowSignature, SHADOW_STATIC_FRAMES, igeShadowCasterIsStatic, type IgeShadowCasterState } from "@/engine/webgl/IgeWebGlShadowManager";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";

const at = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

const frustumOf = (matrix: IgeMatrix4): IgeFrustum => {
	const f = new IgeFrustum();
	f.extractFromMatrix(matrix);
	return f;
};

describe("Shadow caster culling", () => {
	// A light box 100 wide and 100 tall, looking down -z, 200 deep
	const light = frustumOf(new IgeMatrix4().orthographic(-50, 50, -50, 50, 0, 200));

	it("leaves out a caster far outside the light frustum and keeps one at the edge", () => {
		expect(light.containsSphereXYZ(0, 0, -100, 5)).toBe(true);
		expect(light.containsSphereXYZ(1000, 0, -100, 5)).toBe(false);
		// Centre just outside the edge but the sphere reaches in
		expect(light.containsSphereXYZ(53, 0, -100, 5)).toBe(true);
		expect(light.containsSphereXYZ(56, 0, -100, 5)).toBe(false);
	});

	it("tests a swept caster against the camera view: shadow may reach in from outside, not from far away", () => {
		const view = frustumOf(new IgeMatrix4().orthographic(-50, 50, -50, 50, 0, 200));
		// Beside the view, light running sideways across it: the shadow can land in view
		expect(view.sweptSphereVisibleXYZ(80, 0, -100, 5, 1, 0, 0, 100)).toBe(true);
		// Same place, light running straight along the view: it can't
		expect(view.sweptSphereVisibleXYZ(80, 0, -100, 5, 0, 0, 1, 100)).toBe(false);
		// In view: kept
		expect(view.sweptSphereVisibleXYZ(0, 0, -100, 5, 0, 0, 1, 100)).toBe(true);
		// Far away: left out
		expect(view.sweptSphereVisibleXYZ(5000, 0, -100, 5, 0.6, 0, 0.8, 100)).toBe(false);
	});
});

const caster = (): IgeShadowCasterState & { uid: number; pose: number } => ({
	_transformVersion: 0,
	_shadowSeenVersion: -1,
	_shadowStableSince: 0,
	_shadowSeenPose: -1,
	_shadowDynamic: false,
	uid: 1,
	pose: 0
});

describe("Skinned casters by pose version", () => {
	it("settles after 30 unchanged frames, goes dynamic on a pose change, one rebuild per transition", () => {
		const c = caster();
		const sig = (frame: number) => {
			const s = new IgeShadowSignature();
			const isStatic = igeShadowCasterIsStatic(c, frame, true, c.pose);
			if (isStatic) s.add(c.uid, 1, c._transformVersion);
			return { s, isStatic };
		};
		let cache: { a: number; b: number; count: number } | null = null;
		let rebuilds = 0;
		const run = (frame: number) => {
			const { s, isStatic } = sig(frame);
			if (!cache || cache.a !== s.a || cache.b !== s.b || cache.count !== s.count) {
				cache = { a: s.a, b: s.b, count: s.count };
				rebuilds++;
			}
			return isStatic;
		};
		let frame = 100;
		// Still pose: dynamic until it has held for 30 frames
		const states: boolean[] = [];
		for (let i = 0; i < SHADOW_STATIC_FRAMES + 5; i++) states.push(run(frame++));
		expect(states[0]).toBe(false);
		expect(states[SHADOW_STATIC_FRAMES - 1]).toBe(false);
		expect(states[SHADOW_STATIC_FRAMES]).toBe(true);
		expect(states[states.length - 1]).toBe(true);
		// (one build for the empty set, one for joining it)
		expect(rebuilds).toBe(2);
		for (let i = 0; i < 20; i++) run(frame++);
		expect(rebuilds).toBe(2);
		// The pose changes: dynamic again, one rebuild without it
		c.pose++;
		expect(run(frame++)).toBe(false);
		expect(rebuilds).toBe(3);
		// While it keeps changing, nothing rebuilds
		for (let i = 0; i < 10; i++) {
			c.pose++;
			run(frame++);
		}
		expect(rebuilds).toBe(3);
		// Holds still: rejoins after 30 frames, one rebuild
		for (let i = 0; i < SHADOW_STATIC_FRAMES + 5; i++) run(frame++);
		expect(rebuilds).toBe(4);
	});

	it("keeps a skinned caster without a pose version dynamic", () => {
		const c = caster();
		expect(igeShadowCasterIsStatic(c, 1000, true)).toBe(false);
	});
});

describe("Skeleton pose version", () => {
	const manager = new IgeWebGlSkeletonManager();
	const data = igeProceduralSkeleton("pv", [{ name: "a" }, { name: "b", rest: at(5, 0, 0) }]);

	it("moves only when the pose really changes", () => {
		const skeleton = createSkeletonInstance(data);
		manager.updateSkeletonMatrices(skeleton);
		const v0 = skeleton.poseVersion;
		const pose = [...at(0, 0, 0), ...at(5, 0, 0)];
		// The rest pose again: nothing changed
		expect(igeSetBonePose(skeleton, pose)).toBe(false);
		expect(skeleton.dirty).toBe(false);
		manager.updateSkeletonMatrices(skeleton);
		expect(skeleton.poseVersion).toBe(v0);
		// Different matrices: version moves once
		const moved = [...at(0, 0, 0), ...at(5, 3, 0)];
		expect(igeSetBonePose(skeleton, moved)).toBe(true);
		manager.updateSkeletonMatrices(skeleton);
		expect(skeleton.poseVersion).toBe(v0 + 1);
		// Same again: unchanged
		expect(igeSetBonePose(skeleton, moved)).toBe(false);
		manager.updateSkeletonMatrices(skeleton);
		expect(skeleton.poseVersion).toBe(v0 + 1);
		// A write that dirties the skeleton but yields the same skin matrices doesn't move it either
		skeleton.dirty = true;
		manager.updateSkeletonMatrices(skeleton);
		expect(skeleton.poseVersion).toBe(v0 + 1);
	});

	it("entity.setBonePose with identical matrices leaves the skeleton clean", () => {
		const e = new IgeEntity();
		e._skeleton = createSkeletonInstance(data);
		const pose = [...at(0, 0, 0), ...at(5, 0, 0)];
		e.setBonePose(pose);
		manager.updateSkeletonMatrices(e._skeleton);
		e.setBonePose(pose);
		expect(e._skeleton.dirty).toBe(false);
	});
});
