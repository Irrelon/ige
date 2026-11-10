import { IgeEntity } from "@/engine/core/IgeEntity";
import { addShellPart } from "@/engine/webgl/IgeModelShell";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";

/** An axis-aligned box as flat-shaded triangles (four corners per face, as exported toon meshes are), all on `bone`. */
function box (min: number[], max: number[], bone: number, out: { pos: number[]; idx: number[]; joints: number[] }) {
	const corner = (x: number, y: number, z: number) => [x ? max[0] : min[0], y ? max[1] : min[1], z ? max[2] : min[2]];
	// Each face's corners, wound counter-clockwise seen from outside
	const faces = [
		[[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
		[[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
		[[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]
	];
	for (const face of faces) {
		const base = out.pos.length / 3;
		for (const [x, y, z] of face) {
			out.pos.push(...corner(x, y, z));
			out.joints.push(bone, 0, 0, 0);
		}
		out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
	}
}

/** An arm (bone 0) and a hand (bone 1) as two boxes in one skinned mesh. */
function arm (): IgeGltfModel {
	const out = { pos: [] as number[], idx: [] as number[], joints: [] as number[] };
	box([0, 0, 0], [2, 1, 1], 0, out);
	box([2, 0, 0], [3, 1, 1], 1, out);
	const count = out.pos.length / 3;
	const geometry = {
		id: "arm_geo",
		vertices: new Float32Array(out.pos),
		indices: new Uint16Array(out.idx),
		boneIndices: new Uint8Array(out.joints),
		boneWeights: new Float32Array(Array.from({ length: count }, () => [1, 0, 0, 0]).flat()),
		uvs: new Float32Array(count * 2)
	};
	return {
		id: `arm-${Math.random()}`,
		meshes: [{ name: "ArmMesh", primitives: [{ geometry, materialIndex: 0 }] }],
		materials: [],
		nodes: [{ name: "Arm", mesh: 0, skin: 0 }],
		scenes: [{ nodeIndices: [0] }],
		defaultSceneIndex: 0,
		skins: [{ skeleton: { bones: [{ name: "Forearm" }, { name: "Hand" }] } }]
	} as unknown as IgeGltfModel;
}

describe("Shell parts", () => {
	it("cover only the chosen bones' triangles, every face moved out by the same distance", () => {
		const model = arm();
		const glove = addShellPart(model, "Arm", { name: "Glove", bones: ["Hand"], inflate: 0.1, material: { color: { r: 0, g: 0, b: 0, a: 1 } } })!;
		expect(glove.skinned).toBe(true);
		const v = glove.geometryData.vertices!;
		expect(glove.geometryData.indices!.length).toBe(36);
		const xs: number[] = [], ys: number[] = [], zs: number[] = [];
		for (let i = 0; i < v.length; i += 3) {
			xs.push(v[i]);
			ys.push(v[i + 1]);
			zs.push(v[i + 2]);
		}
		const round = (n: number) => Math.round(n * 1000) / 1000;
		// The hand box [2..3, 0..1, 0..1], grown by 0.1 on every side, corners included
		expect([Math.min(...xs), Math.max(...xs)].map(round)).toEqual([1.9, 3.1]);
		expect([Math.min(...ys), Math.max(...ys)].map(round)).toEqual([-0.1, 1.1]);
		expect([Math.min(...zs), Math.max(...zs)].map(round)).toEqual([-0.1, 1.1]);
		// Still on the hand bone
		expect(new Set(glove.geometryData.boneIndices!.filter((_, i) => i % 4 === 0))).toEqual(new Set([1]));
	});

	it("become parts of the model that entities show by name, made once", () => {
		const model = arm();
		const first = addShellPart(model, "Arm", { name: "Glove", bones: ["Hand"], inflate: 0.1 });
		expect(addShellPart(model, "Arm", { name: "Glove", bones: ["Hand"], inflate: 0.1 })).toBe(first);
		expect(getModelParts(model).map((p) => p.name)).toEqual(["Arm", "Glove"]);
		const entity = new IgeEntity().model(model, { parts: ["Arm", "Glove"] });
		expect(entity.modelParts()).toEqual(["Arm", "Glove"]);
		// Nothing on a bone it doesn't have, or a part that isn't there
		expect(addShellPart(model, "Arm", { name: "Tail", bones: ["Tail"], inflate: 0.1 })).toBeUndefined();
		expect(addShellPart(model, "Leg", { name: "Boot", bones: ["Hand"], inflate: 0.1 })).toBeUndefined();
	});

	it("keep only the triangles whose corners pass a test", () => {
		const model = arm();
		const cuff = addShellPart(model, "Arm", { name: "Cuff", bones: ["Forearm", "Hand"], inflate: 0.05, keep: (x) => x >= 2 })!;
		// The hand's six faces and the forearm's end face at x = 2
		expect(cuff.geometryData.indices!.length).toBe(42);
	});
});
