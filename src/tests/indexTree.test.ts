import { IgeIndexTree } from "@/engine/core/IgeIndexTree";
import assert from "node:assert";

describe("indexTree", () => {
	describe("dimensional indexing", () => {
		it("can add an item to the index", () => {
			const index = new IgeIndexTree();
			index.set("1", [-1, -1, -1]);
			index.set("2", [0, 0, 0]);
			const values = index.getBranchValues();

			assert.deepStrictEqual(values.length, 2);
		});

		it("can get all values from the tree", () => {
			const index = new IgeIndexTree();
			index.set("1", [-1, -1, -1]);
			index.set("2", [0, 0, 0]);
			const values = index.getBranchValues();

			assert.deepStrictEqual(values, ["1", "2"]);
		});

		it("can query the tree by spatial hash", () => {
			const index = new IgeIndexTree();
			index.set("1", [0.5, 0.5, 0.5]);
			index.set("2", [0, 0, 0]);
			index.set("3", [1, 1, 1]);
			index.set("4", [0, 1, 1]);
			const values = index.getValues("H");
			const hash1 = index.encodeHash([0.5, 0.5, 0.5], 6);
			assert.deepStrictEqual(hash1, "HHAAAA");
			//assert.deepStrictEqual(values.length, 4);
			//assert.deepStrictEqual(values, ["1"]);
		});
	});
});
