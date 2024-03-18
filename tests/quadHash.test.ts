import { extentsToHash, hashToExtents } from "../src/engine/quadHash";

describe("hashToExtents()", () => {
	it("should correctly convert a 4-level hash to its extents", () => {
		const hash = "ABCD";
		const result = hashToExtents(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-0.375, -0.625, -0.25, -0.5]);
	});

	it("should correctly convert a 10-level hash to its extents", () => {
		const hash = "ABCDAAAAAA";
		const result = hashToExtents(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-0.375, -0.625, -0.373046875, -0.623046875]);
	});

	it("should correctly convert a 20-level hash to its extents", () => {
		const hash = "DACDBCABDABCBCABDABC";
		const result = hashToExtents(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.20048904418945312, 0.4107837677001953, 0.20049095153808594, 0.4107856750488281]);
	});

	it("should throw an Error when an invalid quadrant identifier is used", () => {
		const invalidHash = "ABCDE"; // 'E' is not a valid quadrant identifier

		expect(() => hashToExtents(invalidHash)).toThrowError("Invalid quadrant identifier");
	});
});

describe("extentsToHash()", () => {
	it("should correctly convert an extent to its hash at level 4", () => {
		const hash = "ABCD";
		const result = extentsToHash([-0.375, -0.625, -0.25, -0.5], 4);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly convert an extent to its hash at level 10", () => {
		const hash = "ABCDAAAAAA";
		const result = extentsToHash([-0.375, -0.625, -0.373046875, -0.623046875], 10);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly convert an extent to its hash at level 20", () => {
		const hash = "DACDBCABDABCBCABDABC";
		const result = extentsToHash([0.20048904418945312, 0.4107837677001953, 0.20049095153808594, 0.4107856750488281], 20);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});
});
