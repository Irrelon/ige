import { IgeMatrix2d } from "../engine/core/IgeMatrix2d.js"
/** A row-major 3x3 matrix from its values. */
function matrix(values) {
    const m = new IgeMatrix2d();
    m.matrix = [...values];
    return m;
}
function expectClose(actual, expected) {
    for (let i = 0; i < 9; i++)
        expect(actual[i]).toBeCloseTo(expected[i], 10);
}
const start = [1.2, -0.4, 30, 0.5, 0.9, -12, 0, 0, 1];
describe("IgeMatrix2d in-place transforms", () => {
    it("translateBy multiplies by a translation", () => {
        const expected = matrix(start).multiply(matrix([1, 0, 7, 0, 1, -3, 0, 0, 1]));
        expectClose(matrix(start).translateBy(7, -3).matrix, expected.matrix);
    });
    it("scaleBy multiplies by a scale", () => {
        const expected = matrix(start).multiply(matrix([2, 0, 0, 0, -0.5, 0, 0, 0, 1]));
        expectClose(matrix(start).scaleBy(2, -0.5).matrix, expected.matrix);
    });
    it("rotateBy multiplies by a rotation, about the rotate origin", () => {
        const angle = 0.7, c = Math.cos(angle), s = Math.sin(angle);
        const rotation = [c, -s, 0, s, c, 0, 0, 0, 1];
        expectClose(matrix(start).rotateBy(angle).matrix, matrix(start).multiply(matrix(rotation)).matrix);
        const pivoted = matrix(start);
        pivoted._rotateOrigin.x = 5;
        pivoted._rotateOrigin.y = -2;
        const expected = matrix(start)
            .multiply(matrix([1, 0, 5, 0, 1, -2, 0, 0, 1]))
            .multiply(matrix(rotation))
            .multiply(matrix([1, 0, -5, 0, 1, 2, 0, 0, 1]));
        expectClose(pivoted.rotateBy(angle).matrix, expected.matrix);
    });
});
