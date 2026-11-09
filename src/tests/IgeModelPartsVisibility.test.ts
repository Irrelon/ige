import { IgeEntity } from "@/engine/core/IgeEntity";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";

/** A model with three named, unskinned meshes (a customizable character's parts). */
function customizable (): IgeGltfModel {
	const tri = (id: string) => ({ id, type: "mesh", vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), indices: new Uint16Array([0, 1, 2]) });
	const mesh = (name: string) => ({ name, primitives: [{ geometry: tri(`${name}_geo`), materialIndex: 0 }] });
	return {
		id: `custom-${Math.random()}`,
		meshes: [mesh("BodyMesh_A"), mesh("BodyMesh_B"), mesh("HeadMesh")],
		materials: [],
		nodes: [{ name: "Body_A", mesh: 0 }, { name: "Body_B", mesh: 1 }, { name: "Head_01", mesh: 2 }],
		scenes: [{ nodeIndices: [0, 1, 2] }],
		defaultSceneIndex: 0
	} as unknown as IgeGltfModel;
}

describe("Model part visibility", () => {
	it("names parts after their nodes", () => {
		expect(getModelParts(customizable()).map((p) => p.name)).toEqual(["Body_A", "Body_B", "Head_01"]);
	});

	it("shows one combination per entity, by list or test, and all again with null", () => {
		const model = customizable();
		const a = new IgeEntity().model(model, { parts: ["Body_B", "Head_01"] });
		const b = new IgeEntity().model(model);
		expect(a.modelParts()).toEqual(["Body_B", "Head_01"]);
		expect(b.modelParts()).toEqual(["Body_A", "Body_B", "Head_01"]);
		expect(a._modelPartsShown).toEqual([false, true, true]);

		a.modelParts((name) => name.startsWith("Body"));
		expect(a.modelParts()).toEqual(["Body_A", "Body_B"]);
		a.modelParts(null);
		expect(a._modelPartsShown).toBeUndefined();
	});
});
