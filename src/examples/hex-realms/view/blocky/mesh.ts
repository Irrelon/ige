/**
 * Blocky models, built in code: lists of coloured boxes turned into glTF
 * (vertex colours, no textures), optionally rigged to a few bones with
 * keyframed clips. The result loads through the same glTF loader as the
 * AssetFurnace models, so the game uses them the same way (see
 * view/models.ts, where this is one of the art packs).
 *
 * Units are "pixels": a character is about 22 tall. +Y is up and the front
 * of every model faces +Z.
 */

/** One box: its min corner, size, colour (0xRRGGBB) and the bone that carries it. */
export interface Box {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	c: number;
	bone: number;
}

/** A bone: its parent (-1 for the root) and the point it turns about (model space). */
export interface Bone {
	name: string;
	parent: number;
	pivot: [number, number, number];
}

/** A bone's pose at a moment: turn (radians about x, y, z) and shift from its rest place. */
export interface Pose {
	rot?: [number, number, number];
	pos?: [number, number, number];
}

/** A clip: how long it runs, and each bone's pose at time t (seconds). */
export interface Clip {
	name: string;
	duration: number;
	pose: (t: number) => Record<string, Pose>;
}

export interface BuiltModel {
	gltf: object;
	min: [number, number, number];
	max: [number, number, number];
	triangles: number;
	animations: string[];
	skinned: boolean;
	bytes: number;
}

/** Collects boxes. `bone` is where new boxes go; `seed` varies their shade a touch, like hand-placed blocks. */
export class Vox {
	boxes: Box[] = [];
	bone = 0;
	protected seed: number;

	constructor (seed = 1) {
		this.seed = seed;
	}

	/** A box by its min corner. */
	box (x: number, y: number, z: number, w: number, h: number, d: number, c: number): this {
		if (w > 0 && h > 0 && d > 0) this.boxes.push({ x, y, z, w, h, d, c, bone: this.bone });
		return this;
	}

	/** A box centred on x and z, standing on y. */
	cbox (cx: number, y: number, cz: number, w: number, h: number, d: number, c: number): this {
		return this.box(cx - w / 2, y, cz - d / 2, w, h, d, c);
	}

	/** Boxes added inside fn go on this bone. */
	on (bone: number, fn: () => void): this {
		const was = this.bone;
		this.bone = bone;
		fn();
		this.bone = was;
		return this;
	}

	/** Copy another set of boxes in, moved by (dx, dy, dz) and optionally mirrored or turned a quarter. */
	add (other: Vox, dx = 0, dy = 0, dz = 0, turn: 0 | 1 | 2 | 3 = 0): this {
		for (const b of other.boxes) {
			let { x, z, w, d } = b;
			for (let k = 0; k < turn; k++) {
				// A quarter turn about y: (x, z) -> (z, -x)
				const nx = z, nz = -(x + w);
				[x, z, w, d] = [nx, nz, d, w];
			}
			this.boxes.push({ ...b, x: x + dx, y: b.y + dy, z: z + dz, w, d, bone: b.bone === 0 ? this.bone : b.bone });
		}
		return this;
	}

	/** A tiny, repeatable shade change per box (±4%). */
	jitter (): number {
		this.seed = (this.seed * 16807) % 2147483647;
		return 1 + ((this.seed % 1000) / 1000 - 0.5) * 0.08;
	}
}

// ------------------------------------------------------------------
// glTF
// ------------------------------------------------------------------

const FACES: { n: [number, number, number]; corners: [number, number, number][] }[] = [
	{ n: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
	{ n: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
	{ n: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
	{ n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
	{ n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
	{ n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }
];

/** Colours are sRGB like the rest of the game's materials. */
function rgb (c: number, k: number): [number, number, number] {
	return [Math.min(1, ((c >> 16) & 255) / 255 * k), Math.min(1, ((c >> 8) & 255) / 255 * k), Math.min(1, (c & 255) / 255 * k)];
}

function quat (rx: number, ry: number, rz: number): [number, number, number, number] {
	// Turn about x, then y, then z
	const cx = Math.cos(rx / 2), sx = Math.sin(rx / 2), cy = Math.cos(ry / 2), sy = Math.sin(ry / 2), cz = Math.cos(rz / 2), sz = Math.sin(rz / 2);
	return [
		sx * cy * cz - cx * sy * sz,
		cx * sy * cz + sx * cy * sz,
		cx * cy * sz - sx * sy * cz,
		cx * cy * cz + sx * sy * sz
	];
}

function base64 (bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s);
}

/**
 * Build a glTF from boxes. With bones, the mesh is skinned (each box moves
 * rigidly with its bone) and the clips become its animations.
 */
/** How far a face is pushed out when it would lie on another box's face (pixels). */
const NUDGE = 0.06;

/**
 * Boxes as [min, max] corners, with any face that would lie in the same plane as an earlier box's
 * face (facing the same way and overlapping it) pushed out a little, so the later box (a hat over
 * hair, a trim on a wall) shows cleanly instead of flickering against it. Bottom faces are left
 * alone, so feet and floors stay on the ground.
 */
export function separatedBoxes (boxes: Box[]): [number[], number[]][] {
	const out: [number[], number[]][] = [];
	// Faces filed by plane: axis, side and position (to a thousandth)
	const planes = new Map<string, [number[], number[]][]>();
	const key = (axis: number, side: number, at: number) => `${axis}${side}${Math.round(at * 1000)}`;
	const overlaps = (a: [number[], number[]], b: [number[], number[]], axis: number) => {
		for (let k = 0; k < 3; k++) {
			if (k === axis) continue;
			if (Math.min(a[1][k], b[1][k]) - Math.max(a[0][k], b[0][k]) <= 1e-4) return false;
		}
		return true;
	};
	for (const b of boxes) {
		const box: [number[], number[]] = [[b.x, b.y, b.z], [b.x + b.w, b.y + b.h, b.z + b.d]];
		// Pushing one face out can make the box overlap another along a different face, so go round until settled
		for (let pass = 0, moved = true; moved && pass < 4; pass++) {
			moved = false;
			for (let axis = 0; axis < 3; axis++) {
				for (const side of [0, 1]) {
					if (axis === 1 && side === 0) continue;
					for (let tries = 0; tries < 6; tries++) {
						const clash = planes.get(key(axis, side, box[side][axis]))?.some((o) => overlaps(o, box, axis));
						if (!clash) break;
						box[side][axis] += side ? NUDGE : -NUDGE;
						moved = true;
					}
				}
			}
		}
		for (let axis = 0; axis < 3; axis++) {
			for (const side of [0, 1]) {
				const k = key(axis, side, box[side][axis]);
				const list = planes.get(k);
				if (list) list.push(box);
				else planes.set(k, [box]);
			}
		}
		out.push(box);
	}
	return out;
}

export function buildModel (vox: Vox, bones: Bone[] = [], clips: Clip[] = []): BuiltModel {
	const skinned = bones.length > 0;
	const pos: number[] = [], nrm: number[] = [], col: number[] = [], joints: number[] = [], idx: number[] = [];
	const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
	const corners = separatedBoxes(vox.boxes);
	vox.boxes.forEach((b, bi) => {
		const [lo, hi] = corners[bi];
		const shade = vox.jitter();
		const [r, g, bl] = rgb(b.c, shade);
		for (const f of FACES) {
			const v0 = pos.length / 3;
			for (const [cx, cy, cz] of f.corners) {
				const p = [cx ? hi[0] : lo[0], cy ? hi[1] : lo[1], cz ? hi[2] : lo[2]];
				pos.push(p[0], p[1], p[2]);
				for (let k = 0; k < 3; k++) {
					min[k] = Math.min(min[k], p[k]);
					max[k] = Math.max(max[k], p[k]);
				}
				nrm.push(...f.n);
				col.push(r, g, bl, 1);
				if (skinned) joints.push(b.bone, 0, 0, 0);
			}
			idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
		}
	});
	const vertexCount = pos.length / 3;

	// One binary buffer, each array 4-byte aligned
	const chunks: Uint8Array[] = [];
	let byteLength = 0;
	const views: object[] = [];
	const accessors: object[] = [];
	const push = (data: ArrayBufferView, target?: number): number => {
		const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
		const pad = (4 - (byteLength % 4)) % 4;
		if (pad) {
			chunks.push(new Uint8Array(pad));
			byteLength += pad;
		}
		views.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
		chunks.push(bytes);
		byteLength += bytes.byteLength;
		return views.length - 1;
	};
	const accessor = (data: Float32Array | Uint16Array | Uint32Array | Uint8Array, type: string, componentType: number, count: number, target?: number, extra: object = {}): number => {
		accessors.push({ bufferView: push(data, target), componentType, count, type, ...extra });
		return accessors.length - 1;
	};

	const FLOAT = 5126, USHORT = 5123, UINT = 5125, UBYTE = 5121;
	const attributes: Record<string, number> = {
		POSITION: accessor(new Float32Array(pos), "VEC3", FLOAT, vertexCount, 34962, { min, max }),
		NORMAL: accessor(new Float32Array(nrm), "VEC3", FLOAT, vertexCount, 34962),
		COLOR_0: accessor(new Float32Array(col), "VEC4", FLOAT, vertexCount, 34962)
	};
	if (skinned) {
		attributes.JOINTS_0 = accessor(new Uint8Array(joints), "VEC4", UBYTE, vertexCount, 34962);
		const weights = new Float32Array(vertexCount * 4);
		for (let i = 0; i < vertexCount; i++) weights[i * 4] = 1;
		attributes.WEIGHTS_0 = accessor(weights, "VEC4", FLOAT, vertexCount, 34962);
	}
	const big = vertexCount > 65535;
	const indices = accessor(big ? new Uint32Array(idx) : new Uint16Array(idx), "SCALAR", big ? UINT : USHORT, idx.length, 34963);

	const nodes: object[] = [{ name: "blocks", mesh: 0, ...(skinned ? { skin: 0 } : {}) }];
	const scene: number[] = [0];
	const animations: object[] = [];
	let skins: object[] | undefined;
	if (skinned) {
		const first = nodes.length;
		bones.forEach((bone, i) => {
			const parent = bone.parent >= 0 ? bones[bone.parent].pivot : [0, 0, 0];
			const children = bones.map((b, j) => (b.parent === i ? first + j : -1)).filter((j) => j >= 0);
			nodes.push({
				name: bone.name,
				translation: [bone.pivot[0] - parent[0], bone.pivot[1] - parent[1], bone.pivot[2] - parent[2]],
				...(children.length ? { children } : {})
			});
			if (bone.parent < 0) scene.push(first + i);
		});
		const ibm = new Float32Array(bones.length * 16);
		bones.forEach((bone, i) => {
			ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -bone.pivot[0], -bone.pivot[1], -bone.pivot[2], 1], i * 16);
		});
		skins = [{ joints: bones.map((_, i) => first + i), inverseBindMatrices: accessor(ibm, "MAT4", FLOAT, bones.length) }];

		// Clips, sampled at 20 frames a second (linear in between)
		for (const clip of clips) {
			const frames = Math.max(2, Math.round(clip.duration * 20) + 1);
			const times = new Float32Array(frames);
			const rot = bones.map(() => new Float32Array(frames * 4));
			const tra = bones.map(() => new Float32Array(frames * 3));
			const moves = bones.map(() => false);
			for (let f = 0; f < frames; f++) {
				const t = (f / (frames - 1)) * clip.duration;
				times[f] = t;
				const poses = clip.pose(t);
				bones.forEach((bone, i) => {
					const p = poses[bone.name];
					const parent = bone.parent >= 0 ? bones[bone.parent].pivot : [0, 0, 0];
					rot[i].set(quat(...(p?.rot ?? [0, 0, 0])), f * 4);
					const off = p?.pos ?? [0, 0, 0];
					tra[i].set([bone.pivot[0] - parent[0] + off[0], bone.pivot[1] - parent[1] + off[1], bone.pivot[2] - parent[2] + off[2]], f * 3);
					if (p?.pos) moves[i] = true;
				});
			}
			const input = accessor(times, "SCALAR", FLOAT, frames, undefined, { min: [0], max: [clip.duration] });
			const samplers: object[] = [];
			const channels: object[] = [];
			bones.forEach((_, i) => {
				samplers.push({ input, output: accessor(rot[i], "VEC4", FLOAT, frames), interpolation: "LINEAR" });
				channels.push({ sampler: samplers.length - 1, target: { node: first + i, path: "rotation" } });
				if (moves[i]) {
					samplers.push({ input, output: accessor(tra[i], "VEC3", FLOAT, frames), interpolation: "LINEAR" });
					channels.push({ sampler: samplers.length - 1, target: { node: first + i, path: "translation" } });
				}
			});
			animations.push({ name: clip.name, samplers, channels });
		}
	}

	const all = new Uint8Array(byteLength);
	let at = 0;
	for (const c of chunks) {
		all.set(c, at);
		at += c.byteLength;
	}
	const gltf = {
		asset: { version: "2.0", generator: "Hex Realms blocky pack" },
		scene: 0,
		scenes: [{ nodes: scene }],
		nodes,
		meshes: [{ primitives: [{ attributes, indices, material: 0 }] }],
		materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.9 } }],
		buffers: [{ byteLength, uri: `data:application/octet-stream;base64,${base64(all)}` }],
		bufferViews: views,
		accessors,
		...(skins ? { skins } : {}),
		...(animations.length ? { animations } : {})
	};
	return { gltf, min, max, triangles: idx.length / 3, animations: clips.map((c) => c.name), skinned, bytes: byteLength };
}
