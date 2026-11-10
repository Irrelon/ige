import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { addModelPart, getModelParts, type IgeModelPart } from "@/engine/webgl/IgeModelParts";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";

export interface IgeShellPartOptions {
	/** The new part's name: entities show it with IgeEntity.modelParts(). */
	name: string;
	/** The bones (by name) whose part of the surface it covers: a triangle is kept when each corner is weighted at least half to them. */
	bones: string[];
	/** How far it stands off the surface, in model units: every face moves out by this much, corners included. */
	inflate: number;
	/** Its material (default: the source part's). */
	material?: IgeMaterialData;
	/** Keep only the triangles whose corners (at rest, in the source's model space) all pass this, e.g. below a height. */
	keep?: (x: number, y: number, z: number) => boolean;
}

/**
 * A shell over part of a skinned model part: gloves over a character's hands, boots over its feet, a glow over one arm.
 * Takes the source part's triangles weighted to `bones`, pushes them out along their faces by `inflate` and adds the
 * result to the model's parts under `name`, skinned to the same bones, so it bends with every animation. Make shells
 * before creating entities with the model (an entity made earlier with no parts filter wouldn't show it until
 * entity.model() is called again). Shells of the same source and options are made once per model: the same part
 * comes back. Returns undefined when the source isn't a skinned part or nothing of it is weighted to those bones.
 * @example #Gloves over a soldier's hands
 *     addShellPart(soldiers, "TTS_Body_plain_A_04", {
 *         name: "Gloves_black", bones: ["Bip001 L Hand", "Bip001 R Hand"], inflate: 0.01,
 *         material: { color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, roughness: 0.8 }
 *     });
 *     player.modelParts(["TTS_Body_plain_A_04", "TTS_Head_basic_01", "Gloves_black"]);
 */
export function addShellPart (model: IgeGltfModel, source: string, options: IgeShellPartOptions): IgeModelPart | undefined {
	const parts = getModelParts(model);
	const existing = parts.find((part) => part.name === options.name);
	if (existing) return existing;
	const from = parts.find((part) => part.name === source && part.skinned);
	const skeleton = model.skins?.[0]?.skeleton;
	if (!from || !skeleton) return undefined;
	const geometry = shellGeometry(from.geometryData, new Set(options.bones.map((name) => skeleton.bones.findIndex((b) => b.name === name)).filter((i) => i >= 0)), options);
	if (!geometry) return undefined;
	const part: IgeModelPart = { name: options.name, geometryData: geometry, materialData: options.material ?? from.materialData, skinned: true };
	addModelPart(model, part);
	return part;
}

/** The shell geometry over the triangles of `g` weighted to `bones` (by index), or undefined if there are none. */
export function shellGeometry (g: IgeGeometryData3d, bones: Set<number>, options: Pick<IgeShellPartOptions, "name" | "inflate" | "keep">): IgeGeometryData3d | undefined {
	const pos = g.vertices, idx = g.indices, weights = g.boneWeights, joints = g.boneIndices;
	if (!pos || !weights || !joints) return undefined;
	const vertexCount = pos.length / 3;
	const index = idx ?? Uint32Array.from({ length: vertexCount }, (_, i) => i);

	// Corners weighted at least half to the bones (a joint's ring, shared half and half, counts on both sides)
	const covered = new Uint8Array(vertexCount);
	for (let v = 0; v < vertexCount; v++) {
		let on = 0;
		for (let k = 0; k < 4; k++) if (bones.has(joints[v * 4 + k])) on += weights[v * 4 + k];
		covered[v] = on >= 0.499 && (!options.keep || options.keep(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])) ? 1 : 0;
	}
	const triangles: number[] = [];
	for (let t = 0; t < index.length; t += 3) {
		if (covered[index[t]] && covered[index[t + 1]] && covered[index[t + 2]]) triangles.push(t);
	}
	if (!triangles.length) return undefined;

	// Corners in the same place move together (flat-shaded meshes split them per face), out along every face they
	// touch: the sum of those faces' directions, lengthened so each face moves the full distance
	const key = (v: number) => `${Math.round(pos[v * 3] * 1e5)},${Math.round(pos[v * 3 + 1] * 1e5)},${Math.round(pos[v * 3 + 2] * 1e5)}`;
	const faces = new Map<string, number[][]>();
	for (const t of triangles) {
		const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
		const u = [0, 1, 2].map((k) => pos[b * 3 + k] - pos[a * 3 + k]), w = [0, 1, 2].map((k) => pos[c * 3 + k] - pos[a * 3 + k]);
		const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
		const len = Math.hypot(n[0], n[1], n[2]);
		if (len < 1e-12) continue;
		const unit = n.map((x) => x / len);
		for (const v of [a, b, c]) {
			const list = faces.get(key(v)) ?? faces.set(key(v), []).get(key(v))!;
			if (!list.some((f) => f[0] * unit[0] + f[1] * unit[1] + f[2] * unit[2] > 0.999)) list.push(unit);
		}
	}
	const offsets = new Map<string, number[]>();
	for (const [k, list] of faces) {
		const sum = [0, 1, 2].map((i) => list.reduce((s, f) => s + f[i], 0));
		const len = Math.hypot(sum[0], sum[1], sum[2]);
		if (len < 1e-9) {
			offsets.set(k, [0, 0, 0]);
			continue;
		}
		const n = sum.map((x) => x / len);
		// Lengthen so every face it touches moves by inflate (not past three times as far, at very sharp corners)
		const least = Math.min(...list.map((f) => f[0] * n[0] + f[1] * n[1] + f[2] * n[2]));
		const d = options.inflate / Math.max(1 / 3, least);
		offsets.set(k, n.map((x) => x * d));
	}

	// The kept corners, moved out
	const remap = new Int32Array(vertexCount).fill(-1);
	const used: number[] = [];
	const indices: number[] = [];
	for (const t of triangles) {
		for (let k = 0; k < 3; k++) {
			const v = index[t + k];
			if (remap[v] < 0) {
				remap[v] = used.length;
				used.push(v);
			}
			indices.push(remap[v]);
		}
	}
	const pick = <T extends Float32Array | Uint8Array>(array: T | undefined, size: number, make: (n: number) => T): T | undefined => {
		if (!array) return undefined;
		const out = make(used.length * size);
		used.forEach((v, i) => out.set(array.subarray(v * size, v * size + size), i * size));
		return out;
	};
	const vertices = pick(pos, 3, (n) => new Float32Array(n))!;
	used.forEach((v, i) => {
		const o = offsets.get(key(v)) ?? [0, 0, 0];
		for (let k = 0; k < 3; k++) vertices[i * 3 + k] += o[k];
	});
	return {
		id: `${g.id}_shell_${options.name}`,
		type: g.type,
		vertices,
		normals: pick(g.normals, 3, (n) => new Float32Array(n)),
		uvs: pick(g.uvs, 2, (n) => new Float32Array(n)),
		colors: pick(g.colors, 4, (n) => new Float32Array(n)),
		boneWeights: pick(weights, 4, (n) => new Float32Array(n)),
		boneIndices: pick(joints, 4, (n) => new Uint8Array(n)),
		indices: used.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
		skinIndex: g.skinIndex,
		skeletonId: g.skeletonId
	};
}
