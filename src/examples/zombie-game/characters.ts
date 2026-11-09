import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { humanoidBones, type IgeHumanoidBones } from "@/engine/webgl/IgeHumanoidBones";
import { type IgeModelLodLevel, modelBounds } from "@/engine/webgl/IgeModelParts";

/** What a character can be doing; each maps to a clip in its model (when it has one). */
export type CharacterAction = "idle" | "walk" | "run" | "attack" | "hit" | "death";

/**
 * A kind of character: its model file, size and clips. Kinds are matched
 * to models when they load (see prepareCharacter()); the game picks one
 * per player and a random one per zombie.
 */
export interface CharacterKind {
	id: string;
	/** Model file, relative to the example's page. */
	file: string;
	/** Standing height in world units (generated models), or... */
	height?: number;
	/** ...a fixed scale for models already made to size. */
	scale?: number;
	/** Degrees to turn the model so it faces +Z (the game's forward). */
	yaw?: number;
	/** The model's clip for each action. Walk defaults to the model's first clip. */
	clips?: Partial<Record<CharacterAction, string>>;
	/** Ground speed of the walk clip at normal speed (world units per second), to match feet to movement. */
	walkSpeed: number;
	/** Ground speed of the run clip at normal speed. */
	runSpeed?: number;
	/** Multiplied over the model's colours (untextured stand-ins). Players use their own colour instead when set. */
	tint?: { r: number; g: number; b: number; a: number };
	/** Players: tint with the player's colour (stand-in models that all look alike). */
	playerTint?: boolean;
}

/** A character kind with its loaded model, sized and with its bones found. */
export interface CharacterRig {
	kind: CharacterKind;
	model: IgeGltfModel;
	scale: number;
	/** Height to raise the model by so its feet are on the ground (world units). */
	lift: number;
	/** Hips, hands, legs... (undefined when the rig isn't a humanoid). */
	bones?: IgeHumanoidBones;
	/** Clip names by action; missing actions aren't played. */
	clips: Partial<Record<CharacterAction, string>>;
}

/** The game's stand-in: CesiumMan (walk cycle only), 1.5 model units tall with its feet at 0. */
export const CESIUM_MAN: CharacterKind = {
	id: "cesiumMan",
	file: "../../assets/models/CesiumMan.glb",
	scale: 100,
	walkSpeed: 80,
	tint: { r: 0.45, g: 0.62, b: 0.38, a: 1 },
	playerTint: true
};

/**
 * Generated characters (AssetFurnace, imported with the game's import
 * step): one GLB each, with every move merged in under these clip names.
 */
const GENERATED_CLIPS: Partial<Record<CharacterAction, string>> = {
	idle: "idle", walk: "walk", run: "run", attack: "attack", hit: "hit", death: "death"
};

export const ZOMBIE_KINDS: CharacterKind[] = [CESIUM_MAN];
export const PLAYER_KINDS: CharacterKind[] = [CESIUM_MAN];

/** Adds a generated character kind (used by models.json entries, see loadCharacterKinds()). */
export function generatedKind (id: string, file: string, height: number, walkSpeed: number, runSpeed?: number): CharacterKind {
	return { id, file, height, walkSpeed, runSpeed, clips: { ...GENERATED_CLIPS } };
}

/** Size a kind's model, find its bones and which of its clips exist. */
export function prepareCharacter (kind: CharacterKind, model: IgeGltfModel): CharacterRig {
	const { min, max } = modelBounds(model);
	const scale = kind.scale ?? (kind.height ?? 150) / Math.max(1e-6, max.y - min.y);
	const names = new Set((model.animations || []).map((clip) => clip.name));
	const clips: Partial<Record<CharacterAction, string>> = {};
	const wanted = kind.clips || {};
	for (const action of ["idle", "walk", "run", "attack", "hit", "death"] as CharacterAction[]) {
		const name = wanted[action];
		if (name && names.has(name)) clips[action] = name;
	}
	clips.walk ??= model.animations?.[0]?.name;
	const skeleton = model.skins?.[0]?.skeleton;
	return {
		kind,
		model,
		scale,
		lift: -min.y * scale,
		bones: skeleton ? humanoidBones(skeleton) : undefined,
		clips
	};
}

/**
 * The entity that draws a character: a child of the character's root
 * entity (which the game moves, turns and gives a physics body), raised so
 * the feet touch the ground, scaled and turned to face +Z.
 */
export function createCharacterModel (rig: CharacterRig, root: IgeEntity, options: { lod?: IgeModelLodLevel[] } = {}): IgeEntity {
	const inPlace = (["walk", "run", "idle"] as CharacterAction[]).map((a) => rig.clips[a]).filter((n): n is string => !!n);
	const entity = new IgeEntity()
		.model(rig.model, { animation: rig.clips.idle ?? rig.clips.walk, lod: options.lod, inPlace })
		.translateTo(0, rig.lift, 0)
		.scaleTo(rig.scale, rig.scale, rig.scale)
		.mount(root);
	if (rig.kind.yaw) entity.rotateTo(0, (rig.kind.yaw * Math.PI) / 180, 0);
	return entity;
}

/**
 * Model-space transform for an item held in the right fist, in the pose
 * the character's model is animated to now: its +Y (a blade) sticks out
 * of the fist at right angles to the forearm, toward the way the character
 * faces; its +X runs along the forearm and +Z is the flat side. Sized by
 * `scale`. For IgeEntity.attachAt(matrix, { pose: "current" }).
 */
export function rightFistMatrix (rig: CharacterRig, model: IgeEntity, scale: number): Float32Array | undefined {
	const bones = rig.bones;
	const skeleton = model._skeleton;
	if (!bones || !skeleton) return;
	const hand = skeleton.data.bones.findIndex((b) => b.name === bones.right.hand);
	const forearm = skeleton.data.bones.findIndex((b) => b.name === bones.right.forearm);
	if (hand < 0 || forearm < 0) return;
	model._updateSkeletonMatrices();
	const w = skeleton.worldMatrices;
	const wrist = [w[hand * 16 + 12], w[hand * 16 + 13], w[hand * 16 + 14]];
	const elbow = [w[forearm * 16 + 12], w[forearm * 16 + 13], w[forearm * 16 + 14]];
	const d = normalise([wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]]);
	if (!d) return;
	// The fist is a little past the wrist, along the forearm
	const reach = bones.height * 0.045;
	const fist = [wrist[0] + d[0] * reach, wrist[1] + d[1] * reach, wrist[2] + d[2] * reach];
	// Blade: the character's forward with the forearm direction taken out (or up, if the forearm points forward)
	const f = [bones.forward.x, bones.forward.y, bones.forward.z];
	const along = dot(f, d);
	const blade = normalise([f[0] - d[0] * along, f[1] - d[1] * along, f[2] - d[2] * along]) ??
		normalise([-d[0] * d[1], 1 - d[1] * d[1], -d[2] * d[1]])!;
	const flat = normalise(cross(d, blade))!;
	const width = cross(blade, flat);
	return new Float32Array([
		width[0] * scale, width[1] * scale, width[2] * scale, 0,
		blade[0] * scale, blade[1] * scale, blade[2] * scale, 0,
		flat[0] * scale, flat[1] * scale, flat[2] * scale, 0,
		fist[0], fist[1], fist[2], 1
	]);
}

type V3 = number[];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalise (v: V3): V3 | undefined {
	const len = Math.hypot(v[0], v[1], v[2]);
	return len > 1e-6 ? [v[0] / len, v[1] / len, v[2] / len] : undefined;
}

/** A generated weapon, as the import step records it in assets/props.json (model space). */
export interface WeaponInfo {
	id: string;
	file: string;
	role: "weapon";
	/** Where the hand holds it. */
	grip: [number, number, number];
	/** Unit direction from the grip toward the tip. */
	axis: [number, number, number];
	/** Unit direction across it (a blade's width, an axe head). */
	edge: [number, number, number];
	/** Length along the axis. */
	length: number;
}

/**
 * Model-space transform (in the character's model) for a generated weapon
 * held in the right fist: grip in the fist, tip pointing out of it the way
 * rightFistMatrix() points, its edge along the forearm, `length` world
 * units long. For IgeEntity.attachAt(matrix, { pose: "current" }).
 */
export function weaponMatrix (rig: CharacterRig, model: IgeEntity, weapon: WeaponInfo, length: number): Float32Array | undefined {
	const fist = rightFistMatrix(rig, model, 1);
	if (!fist) return;
	const s = length / rig.scale / Math.max(1e-6, weapon.length);
	const axis = weapon.axis, edge = weapon.edge;
	const third = cross(edge, axis);
	// R maps the weapon's (edge, axis, third) onto the fist's (X, Y, Z); the weapon's linear part is fist * s * R
	const R = [edge, axis, third]; // rows
	const L = new Array(9).fill(0); // column-major 3x3
	for (let col = 0; col < 3; col++) {
		for (let row = 0; row < 3; row++) {
			let v = 0;
			for (let k = 0; k < 3; k++) v += fist[k * 4 + row] * R[k][col];
			L[col * 3 + row] = v * s;
		}
	}
	const g = weapon.grip;
	const tx = fist[12] - (L[0] * g[0] + L[3] * g[1] + L[6] * g[2]);
	const ty = fist[13] - (L[1] * g[0] + L[4] * g[1] + L[7] * g[2]);
	const tz = fist[14] - (L[2] * g[0] + L[5] * g[1] + L[8] * g[2]);
	return new Float32Array([L[0], L[1], L[2], 0, L[3], L[4], L[5], 0, L[6], L[7], L[8], 0, tx, ty, tz, 1]);
}
