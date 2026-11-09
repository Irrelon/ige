import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import { restBoneMatrices } from "@/engine/webgl/IgeModelParts";

type Vec3 = { x: number; y: number; z: number };

/** One side of a humanoid rig (bone names). */
export interface IgeHumanoidSide {
	/** The collarbone, when the rig has one. */
	shoulder?: string;
	upperArm: string;
	forearm: string;
	/** Its joint is the wrist; items in hand attach here (IgeEntity.attachToBone()). */
	hand: string;
	thigh: string;
	shin: string;
	/** Its joint is the ankle. */
	foot: string;
}

/** The main bones of a humanoid rig, found by IgeHumanoidBones' humanoidBones(). */
export interface IgeHumanoidBones {
	hips: string;
	/** The spine bones from the hips up to the chest (the one the arms hang from), hips excluded. */
	spine: string[];
	chest: string;
	neck?: string;
	head: string;
	/** An end bone above the head (its joint marks the top of the head bone), when the rig has one. */
	headEnd?: string;
	/** The character's own left and right (as it faces `forward`). */
	left: IgeHumanoidSide;
	right: IgeHumanoidSide;
	/** The way the character faces, in model space (from its toes). */
	forward: Vec3;
	/** Rest height from the lowest to the highest joint, in model units. */
	height: number;
}

const cache: WeakMap<IgeSkeletonData, IgeHumanoidBones | null> = new WeakMap();

/** Model-space rest positions of every joint (through any armature node above the roots). */
export function restJointPositions (skeleton: IgeSkeletonData): Vec3[] {
	return restBoneMatrices(skeleton).map((m) => ({ x: m[12], y: m[13], z: m[14] }));
}

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * Finds the hips, spine, head, arms, hands and legs of a humanoid rig from
 * its shape alone (bone names are ignored, so it works on auto-rigged
 * models whose bones are numbered): the head is the highest end bone, the
 * feet the two lowest, the hips where the legs meet, and the arms the two
 * chains that reach furthest out from the spine. In each limb the two
 * longest consecutive bones are the upper and lower arm (or leg). Left
 * and right are the character's own, facing the way its toes point.
 *
 * Returns undefined when the skeleton doesn't look like a humanoid.
 * Results are cached per skeleton.
 * @example #Put a weapon in a generated character's right hand
 *     const bones = humanoidBones(model.skins[0].skeleton);
 *     sword.mount(character).attachToBone(bones.right.hand);
 */
export function humanoidBones (skeleton: IgeSkeletonData): IgeHumanoidBones | undefined {
	let result = cache.get(skeleton);
	if (result === undefined) {
		result = findHumanoid(skeleton) ?? null;
		cache.set(skeleton, result);
	}
	return result ?? undefined;
}

function findHumanoid (skeleton: IgeSkeletonData): IgeHumanoidBones | undefined {
	const bones = skeleton.bones;
	if (bones.length < 9) return undefined;
	const pos = restJointPositions(skeleton);
	const leaves = bones.filter((b) => !b.childIndices.length).map((b) => b.index);
	if (leaves.length < 5) return undefined;

	let minY = Infinity, maxY = -Infinity;
	for (const p of pos) {
		minY = Math.min(minY, p.y);
		maxY = Math.max(maxY, p.y);
	}
	const height = maxY - minY;
	if (!(height > 0)) return undefined;

	const ancestors = (index: number): number[] => {
		const out: number[] = [];
		for (let i = index; i >= 0; i = bones[i].parentIndex) out.push(i);
		return out; // self first, root last
	};
	/** Bones from `from` (exclusive) down to `to` (inclusive). */
	const pathDown = (from: number, to: number): number[] => {
		const up = ancestors(to);
		const at = up.indexOf(from);
		return at < 0 ? [] : up.slice(0, at).reverse();
	};
	const lca = (a: number, b: number): number => {
		const set = new Set(ancestors(a));
		for (const i of ancestors(b)) if (set.has(i)) return i;
		return -1;
	};

	// Head: the highest end bone; feet: the two lowest end bones on different legs
	const headLeaf = leaves.reduce((best, i) => (pos[i].y > pos[best].y ? i : best), leaves[0]);
	const byHeight = leaves.filter((i) => i !== headLeaf).sort((a, b) => pos[a].y - pos[b].y);
	const footA = byHeight[0];
	const headLine = new Set(ancestors(headLeaf));
	const footB = byHeight.slice(1).find((i) => headLine.has(lca(footA, i)));
	if (footB === undefined) return undefined;
	const hips = lca(footA, footB);
	if (hips < 0 || !headLine.has(hips)) return undefined;

	const spinePath = [hips, ...pathDown(hips, headLeaf)];
	const onSpine = new Set(spinePath);

	// Facing: the way the toes point from the ankles
	const legA = pathDown(hips, footA);
	const legB = pathDown(hips, footB);
	const limb = (chain: number[]) => {
		if (chain.length < 3) return undefined;
		let best = 0, bestLength = -1;
		for (let i = 0; i + 2 < chain.length; i++) {
			const length = distance(pos[chain[i]], pos[chain[i + 1]]) + distance(pos[chain[i + 1]], pos[chain[i + 2]]);
			if (length > bestLength) {
				bestLength = length;
				best = i;
			}
		}
		return { root: best > 0 ? chain[best - 1] : undefined, upper: chain[best], lower: chain[best + 1], end: chain[best + 2] };
	};
	const legs = [limb(legA), limb(legB)];
	if (!legs[0] || !legs[1]) return undefined;
	let fx = 0, fz = 0;
	for (const [leg, toe] of [[legs[0], footA], [legs[1], footB]] as const) {
		fx += pos[toe].x - pos[leg.end].x;
		fz += pos[toe].z - pos[leg.end].z;
	}
	const flen = Math.hypot(fx, fz);
	const forward: Vec3 = flen > height * 0.01 ? { x: fx / flen, y: 0, z: fz / flen } : { x: 0, y: 0, z: 1 };
	const right: Vec3 = { x: -forward.z, y: 0, z: forward.x }; // forward x up
	const side = (i: number) => (pos[i].x - pos[hips].x) * right.x + (pos[i].z - pos[hips].z) * right.z;

	// Arms: the two chains off the spine (above the hips) that reach furthest out sideways
	const reach = (index: number): number => {
		let best = Math.abs(side(index));
		for (const child of bones[index].childIndices) best = Math.max(best, reach(child));
		return best;
	};
	const armRoots: { root: number; reach: number }[] = [];
	for (const s of spinePath.slice(1)) {
		for (const child of bones[s].childIndices) {
			if (!onSpine.has(child)) armRoots.push({ root: child, reach: reach(child) });
		}
	}
	armRoots.sort((a, b) => b.reach - a.reach);
	if (armRoots.length < 2 || armRoots[1].reach < height * 0.12) return undefined;

	/** Down a chain, taking the child with the longest way to an end each time. */
	const depthCache = new Map<number, number>();
	const longest = (index: number): number => {
		let d = depthCache.get(index);
		if (d === undefined) {
			d = 0;
			for (const child of bones[index].childIndices) d = Math.max(d, distance(pos[index], pos[child]) + longest(child));
			depthCache.set(index, d);
		}
		return d;
	};
	const mainChain = (start: number): number[] => {
		const chain = [start];
		for (let at = start; bones[at].childIndices.length;) {
			at = bones[at].childIndices.reduce((best, c) =>
				(distance(pos[at], pos[c]) + longest(c) > distance(pos[at], pos[best]) + longest(best) ? c : best));
			chain.push(at);
		}
		return chain;
	};
	const arms = [armRoots[0].root, armRoots[1].root].map((root) => ({ root, limb: limb(mainChain(root)) }));
	if (!arms[0].limb || !arms[1].limb) return undefined;
	const armSide = arms.map((arm) => side(arm.limb!.end));
	const legSide = legs.map((leg) => side(leg!.end));
	if (armSide[0] * armSide[1] >= 0 || legSide[0] * legSide[1] >= 0) return undefined;

	// The chest is the highest spine bone an arm hangs from
	const armParents = arms.map((arm) => bones[arm.root].parentIndex);
	const chestAt = Math.max(...armParents.map((p) => spinePath.indexOf(p)));
	const above = spinePath.slice(chestAt + 1);
	if (!above.length) return undefined;
	const head = above.length >= 2 ? above[above.length - 2] : above[0];
	const headEnd = above.length >= 2 ? above[above.length - 1] : undefined;
	const neck = above.length >= 3 ? above[0] : undefined;

	const name = (i: number | undefined) => (i === undefined ? undefined : bones[i].name);
	const sideBones = (arm: typeof arms[number], leg: NonNullable<typeof legs[number]>): IgeHumanoidSide => ({
		shoulder: name(arm.limb!.root),
		upperArm: name(arm.limb!.upper)!,
		forearm: name(arm.limb!.lower)!,
		hand: name(arm.limb!.end)!,
		thigh: name(leg.upper)!,
		shin: name(leg.lower)!,
		foot: name(leg.end)!
	});
	const rightArm = armSide[0] > 0 ? arms[0] : arms[1];
	const leftArm = armSide[0] > 0 ? arms[1] : arms[0];
	const rightLeg = legSide[0] > 0 ? legs[0]! : legs[1]!;
	const leftLeg = legSide[0] > 0 ? legs[1]! : legs[0]!;

	return {
		hips: name(hips)!,
		spine: spinePath.slice(1, chestAt + 1).map((i) => bones[i].name),
		chest: name(spinePath[chestAt])!,
		neck: name(neck),
		head: name(head)!,
		headEnd: name(headEnd),
		left: sideBones(leftArm, leftLeg),
		right: sideBones(rightArm, rightLeg),
		forward,
		height
	};
}
