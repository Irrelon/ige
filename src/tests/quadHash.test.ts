import { decode, encode } from "@/engine/utils/quadHash";

describe("hashToExtents()", () => {
	it("should correctly encode `A`", () => {
		const hash = "A";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, -1, -1, 0, 0, 0]);
	});

	it("should correctly encode `AA`", () => {
		const hash = "AA";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, -1, -1, -0.5, -0.5, -0.5]);
	});

	it("should correctly encode `B`", () => {
		const hash = "B";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0, -1, -1, 1, 0, 0]);
	});

	it("should correctly encode `BB`", () => {
		const hash = "BB";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.5, -1, -1, 1, -0.5, -0.5]);
	});

	it("should correctly encode `C`", () => {
		const hash = "C";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, 0, -1, 0, 1, 0]);
	});

	it("should correctly encode `CC`", () => {
		const hash = "CC";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, 0.5, -1, -0.5, 1, -0.5]);
	});

	it("should correctly encode `D`", () => {
		const hash = "D";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0, 0, -1, 1, 1, 0]);
	});

	it("should correctly encode `DD`", () => {
		const hash = "DD";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.5, 0.5, -1, 1, 1, -0.5]);
	});

	it("should correctly encode `E`", () => {
		const hash = "E";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, -1, 0, 0, 0, 1]);
	});

	it("should correctly encode `EE`", () => {
		const hash = "EE";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, -1, 0.5, -0.5, -0.5, 1]);
	});

	it("should correctly encode `F`", () => {
		const hash = "F";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0, -1, 0, 1, 0, 1]);
	});

	it("should correctly encode `FF`", () => {
		const hash = "FF";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.5, -1, 0.5, 1, -0.5, 1]);
	});

	it("should correctly encode `G`", () => {
		const hash = "G";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, 0, 0, 0, 1, 1]);
	});

	it("should correctly encode `GG`", () => {
		const hash = "GG";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-1, 0.5, 0.5, -0.5, 1, 1]);
	});

	it("should correctly encode `H`", () => {
		const hash = "H";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0, 0, 0, 1, 1, 1]);
	});

	it("should correctly encode `HH`", () => {
		const hash = "HH";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.5, 0.5, 0.5, 1, 1, 1]);
	});

	it("should correctly encode ABCD", () => {
		const hash = "ABCD";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-0.375, -0.625, -1, -0.25, -0.5, -0.875]);
	});

	it("should correctly encode EFGH", () => {
		const hash = "EFGH";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-0.375, -0.625, 0.875, -0.25, -0.5, 1]);
	});

	it("should correctly encode ABCDAAAAAA", () => {
		const hash = "ABCDAAAAAA";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([-0.375, -0.625, -1, -0.373046875, -0.623046875, -0.998046875]);
	});

	it("should correctly encode DACDBCABDABCBCABDABC", () => {
		const hash = "DACDBCABDABCBCABDABC";
		const result = decode(hash);

		expect(result).toBeDefined();
		expect(result).toEqual([0.20048904418945312, 0.4107837677001953, -1, 0.20049095153808594, 0.4107856750488281, -0.9999980926513672]);
	});

	it("should throw an Error when an invalid quadrant identifier is used", () => {
		const invalidHash = "ABCDEFGHI"; // 'I' is not a valid quadrant identifier

		expect(() => decode(invalidHash)).toThrowError("Invalid quadrant identifier");
	});
});

describe("extentsToHash()", () => {
	it("should correctly encode A", () => {
		const hash = "A";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode B", () => {
		const hash = "B";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode C", () => {
		const hash = "C";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode D", () => {
		const hash = "D";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode E", () => {
		const hash = "E";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode F", () => {
		const hash = "F";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode G", () => {
		const hash = "G";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode H", () => {
		const hash = "H";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 1);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode ABCD", () => {
		const hash = "ABCD";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 4);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode ABCDAAAAAA", () => {
		const hash = "ABCDAAAAAA";
		const expectedArr = decode(hash);
		const result = encode(expectedArr, 10);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});

	it("should correctly encode DACDBCABDABCBCABDABC", () => {
		const hash = "DACDBCABDABCBCABDABC";
		const expectedArr = decode(hash);
		console.log("DACDBCABDABCBCABDABC", expectedArr);
		const result = encode(expectedArr, 20);

		expect(result).toBeDefined();
		expect(result).toEqual(hash);
	});
});
