"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeMatrix4_1 = require("../engine/core/IgeMatrix4.js");
const IgePoint3d_1 = require("../engine/core/IgePoint3d.js");
describe("IgeMatrix4", () => {
    describe("identity", () => {
        it("creates a valid identity matrix by default", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const matrix = m.matrix;
            // Check diagonal
            expect(matrix[0]).toBe(1);
            expect(matrix[5]).toBe(1);
            expect(matrix[10]).toBe(1);
            expect(matrix[15]).toBe(1);
            // Check off-diagonal elements are 0
            expect(matrix[1]).toBe(0);
            expect(matrix[2]).toBe(0);
            expect(matrix[4]).toBe(0);
        });
        it("can reset to identity matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(10, 20, 30);
            m.identity();
            expect(m.matrix[12]).toBe(0);
            expect(m.matrix[13]).toBe(0);
            expect(m.matrix[14]).toBe(0);
        });
    });
    describe("copy and clone", () => {
        it("can copy from another matrix", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            m1.translateTo(10, 20, 30);
            const m2 = new IgeMatrix4_1.IgeMatrix4();
            m2.copy(m1);
            expect(m2.matrix[12]).toBe(10);
            expect(m2.matrix[13]).toBe(20);
            expect(m2.matrix[14]).toBe(30);
        });
        it("can clone a matrix", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            m1.translateTo(5, 10, 15);
            const m2 = m1.clone();
            expect(m2.matrix[12]).toBe(5);
            expect(m2.matrix[13]).toBe(10);
            expect(m2.matrix[14]).toBe(15);
            // Modifying original shouldn't affect clone
            m1.translateTo(100, 100, 100);
            expect(m2.matrix[12]).toBe(5);
        });
    });
    describe("compare", () => {
        it("returns true for identical matrices", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            m1.translateTo(10, 20, 30);
            const m2 = new IgeMatrix4_1.IgeMatrix4();
            m2.translateTo(10, 20, 30);
            expect(m1.compare(m2)).toBe(true);
        });
        it("returns false for different matrices", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            m1.translateTo(10, 20, 30);
            const m2 = new IgeMatrix4_1.IgeMatrix4();
            m2.translateTo(10, 20, 31);
            expect(m1.compare(m2)).toBe(false);
        });
    });
    describe("translation", () => {
        it("can set translation with translateTo", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(5, 10, 15);
            // Translation is stored in column 3 (indices 12, 13, 14)
            expect(m.matrix[12]).toBe(5);
            expect(m.matrix[13]).toBe(10);
            expect(m.matrix[14]).toBe(15);
        });
        it("can accumulate translation with translateBy", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(5, 10, 15);
            m.translateBy(10, 20, 30);
            expect(m.matrix[12]).toBe(15);
            expect(m.matrix[13]).toBe(30);
            expect(m.matrix[14]).toBe(45);
        });
    });
    describe("rotation", () => {
        it("rotates around X axis correctly", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.rotateXTo(Math.PI / 2); // 90 degrees
            // After 90 degree X rotation:
            // Y becomes Z, Z becomes -Y
            const point = new IgePoint3d_1.IgePoint3d(0, 1, 0);
            m.transformVector(point);
            expect(point.x).toBeCloseTo(0, 5);
            expect(point.y).toBeCloseTo(0, 5);
            expect(point.z).toBeCloseTo(1, 5);
        });
        it("rotates around Y axis correctly", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.rotateYTo(Math.PI / 2); // 90 degrees
            // After 90 degree Y rotation:
            // X becomes -Z, Z becomes X
            const point = new IgePoint3d_1.IgePoint3d(1, 0, 0);
            m.transformVector(point);
            expect(point.x).toBeCloseTo(0, 5);
            expect(point.y).toBeCloseTo(0, 5);
            expect(point.z).toBeCloseTo(-1, 5);
        });
        it("rotates around Z axis correctly", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.rotateZTo(Math.PI / 2); // 90 degrees
            // After 90 degree Z rotation:
            // X becomes Y, Y becomes -X
            const point = new IgePoint3d_1.IgePoint3d(1, 0, 0);
            m.transformVector(point);
            expect(point.x).toBeCloseTo(0, 5);
            expect(point.y).toBeCloseTo(1, 5);
            expect(point.z).toBeCloseTo(0, 5);
        });
        it("can chain rotations", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.rotateZTo(Math.PI); // 180 degrees
            const point = new IgePoint3d_1.IgePoint3d(1, 0, 0);
            m.transformVector(point);
            expect(point.x).toBeCloseTo(-1, 5);
            expect(point.y).toBeCloseTo(0, 5);
        });
    });
    describe("scale", () => {
        it("can set scale with scaleTo", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(2, 3, 4);
            // Scale is stored in diagonal (indices 0, 5, 10)
            expect(m.matrix[0]).toBe(2);
            expect(m.matrix[5]).toBe(3);
            expect(m.matrix[10]).toBe(4);
        });
        it("can scale a point", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(2, 3, 4);
            const point = new IgePoint3d_1.IgePoint3d(1, 1, 1);
            m.transformPoint(point);
            expect(point.x).toBe(2);
            expect(point.y).toBe(3);
            expect(point.z).toBe(4);
        });
    });
    describe("matrix multiplication", () => {
        it("identity times identity equals identity", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            const m2 = new IgeMatrix4_1.IgeMatrix4();
            m1.multiply(m2);
            expect(m1.matrix[0]).toBe(1);
            expect(m1.matrix[5]).toBe(1);
            expect(m1.matrix[10]).toBe(1);
            expect(m1.matrix[15]).toBe(1);
        });
        it("combines translation matrices correctly", () => {
            const m1 = new IgeMatrix4_1.IgeMatrix4();
            m1.translateTo(10, 0, 0);
            const m2 = new IgeMatrix4_1.IgeMatrix4();
            m2.translateTo(5, 0, 0);
            m1.multiply(m2);
            expect(m1.matrix[12]).toBe(15);
        });
        it("combines scale and translation correctly", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(2, 2, 2);
            const t = new IgeMatrix4_1.IgeMatrix4();
            t.translateTo(10, 10, 10);
            // Scale then translate: result = scale * translate
            m.multiply(t);
            // Point at origin should move to (20, 20, 20) because translation is scaled
            const point = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            m.transformPoint(point);
            expect(point.x).toBe(20);
            expect(point.y).toBe(20);
            expect(point.z).toBe(20);
        });
        it("can multiply by scalar", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.multiplyScalar(2);
            expect(m.matrix[0]).toBe(2);
            expect(m.matrix[5]).toBe(2);
            expect(m.matrix[10]).toBe(2);
            expect(m.matrix[15]).toBe(2);
        });
    });
    describe("perspective projection", () => {
        it("creates a valid perspective matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const fov = Math.PI / 4; // 45 degrees
            const aspect = 16 / 9;
            const near = 0.1;
            const far = 1000;
            m.perspective(fov, aspect, near, far);
            // Check that key elements are non-zero
            expect(m.matrix[0]).not.toBe(0);
            expect(m.matrix[5]).not.toBe(0);
            expect(m.matrix[10]).not.toBe(0);
            expect(m.matrix[11]).toBe(-1); // Perspective divide indicator
            expect(m.matrix[15]).toBe(0);
        });
        it("preserves points at different distances", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.perspective(Math.PI / 4, 1, 0.1, 1000);
            // A point directly in front should have correct z mapping
            const nearPoint = new IgePoint3d_1.IgePoint3d(0, 0, -1);
            m.transformPoint(nearPoint);
            // The z should be mapped into [-1, 1] range after perspective divide
            expect(nearPoint.z).toBeGreaterThan(-1);
            expect(nearPoint.z).toBeLessThan(1);
        });
    });
    describe("orthographic projection", () => {
        it("creates a valid orthographic matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.orthographic(-10, 10, -10, 10, 0.1, 1000);
            // Check that scale elements are set
            expect(m.matrix[0]).not.toBe(0); // X scale
            expect(m.matrix[5]).not.toBe(0); // Y scale
            expect(m.matrix[10]).not.toBe(0); // Z scale
            // No perspective divide in ortho
            expect(m.matrix[11]).toBe(0);
            expect(m.matrix[15]).toBe(1);
        });
        it("maps view volume correctly", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.orthographic(-10, 10, -10, 10, -10, 10);
            // Point at left edge should map to x = -1
            const leftPoint = new IgePoint3d_1.IgePoint3d(-10, 0, 0);
            m.transformPoint(leftPoint);
            expect(leftPoint.x).toBeCloseTo(-1, 5);
            // Point at right edge should map to x = 1
            const rightPoint = new IgePoint3d_1.IgePoint3d(10, 0, 0);
            m.transformPoint(rightPoint);
            expect(rightPoint.x).toBeCloseTo(1, 5);
        });
    });
    describe("lookAt", () => {
        it("creates a valid view matrix looking at origin", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const eye = new IgePoint3d_1.IgePoint3d(0, 0, 5);
            const target = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            const up = new IgePoint3d_1.IgePoint3d(0, 1, 0);
            m.lookAt(eye, target, up);
            // The view matrix should be orthonormal (rotation part)
            // Check that the matrix is valid
            expect(m.matrix[15]).toBe(1);
            // Transform origin should give negative eye in view space
            const origin = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            m.transformPoint(origin);
            expect(origin.z).toBeCloseTo(-5, 5);
        });
        it("handles looking from different positions", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const eye = new IgePoint3d_1.IgePoint3d(10, 10, 10);
            const target = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            const up = new IgePoint3d_1.IgePoint3d(0, 1, 0);
            m.lookAt(eye, target, up);
            // Target should be at origin in view space, but at negative z
            const targetPoint = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            m.transformPoint(targetPoint);
            // Distance from eye to target is sqrt(10^2 + 10^2 + 10^2) = sqrt(300)
            const expectedDistance = Math.sqrt(300);
            expect(targetPoint.z).toBeCloseTo(-expectedDistance, 3);
        });
        it("handles looking straight down", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const eye = new IgePoint3d_1.IgePoint3d(0, 100, 0);
            const target = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            const up = new IgePoint3d_1.IgePoint3d(0, 0, -1); // Use Z as up when looking down Y
            m.lookAt(eye, target, up);
            // Should still produce valid matrix
            expect(m.matrix[15]).toBe(1);
        });
    });
    describe("inverse", () => {
        it("can invert an identity matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const inv = m.getInverse();
            expect(inv).not.toBeNull();
            if (inv) {
                expect(inv.matrix[0]).toBe(1);
                expect(inv.matrix[5]).toBe(1);
                expect(inv.matrix[10]).toBe(1);
                expect(inv.matrix[15]).toBe(1);
            }
        });
        it("can invert a translation matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(10, 20, 30);
            const inv = m.getInverse();
            expect(inv).not.toBeNull();
            if (inv) {
                expect(inv.matrix[12]).toBeCloseTo(-10, 5);
                expect(inv.matrix[13]).toBeCloseTo(-20, 5);
                expect(inv.matrix[14]).toBeCloseTo(-30, 5);
            }
        });
        it("inverse times original gives identity", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(10, 20, 30);
            m.rotateXTo(Math.PI / 4);
            m.scaleTo(2, 3, 4);
            const inv = m.getInverse();
            expect(inv).not.toBeNull();
            if (inv) {
                const result = m.clone();
                result.multiply(inv);
                // Result should be approximately identity
                expect(result.matrix[0]).toBeCloseTo(1, 4);
                expect(result.matrix[5]).toBeCloseTo(1, 4);
                expect(result.matrix[10]).toBeCloseTo(1, 4);
                expect(result.matrix[15]).toBeCloseTo(1, 4);
                expect(result.matrix[12]).toBeCloseTo(0, 4);
                expect(result.matrix[13]).toBeCloseTo(0, 4);
                expect(result.matrix[14]).toBeCloseTo(0, 4);
            }
        });
        it("returns null for singular matrix", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(0, 1, 1); // Singular matrix (zero scale)
            const inv = m.getInverse();
            expect(inv).toBeNull();
        });
    });
    describe("transformPoint", () => {
        it("applies translation to points", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(5, 10, 15);
            const point = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            m.transformPoint(point);
            expect(point.x).toBe(5);
            expect(point.y).toBe(10);
            expect(point.z).toBe(15);
        });
        it("applies combined transformations", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(2, 2, 2);
            m.translateBy(5, 5, 5);
            const point = new IgePoint3d_1.IgePoint3d(1, 1, 1);
            m.transformPoint(point);
            // First scale (1,1,1) -> (2,2,2), then translate (+5,+5,+5) -> (7,7,7)
            // But matrix is scale*translate, so translation is scaled
            expect(point.x).toBe(12);
            expect(point.y).toBe(12);
            expect(point.z).toBe(12);
        });
    });
    describe("transformVector", () => {
        it("ignores translation", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.translateTo(100, 100, 100);
            const vector = new IgePoint3d_1.IgePoint3d(1, 0, 0);
            m.transformVector(vector);
            // Vector should be unchanged by translation
            expect(vector.x).toBe(1);
            expect(vector.y).toBe(0);
            expect(vector.z).toBe(0);
        });
        it("applies rotation to vectors", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.rotateZTo(Math.PI / 2);
            const vector = new IgePoint3d_1.IgePoint3d(1, 0, 0);
            m.transformVector(vector);
            expect(vector.x).toBeCloseTo(0, 5);
            expect(vector.y).toBeCloseTo(1, 5);
            expect(vector.z).toBeCloseTo(0, 5);
        });
        it("applies scale to vectors", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            m.scaleTo(2, 3, 4);
            const vector = new IgePoint3d_1.IgePoint3d(1, 1, 1);
            m.transformVector(vector);
            expect(vector.x).toBe(2);
            expect(vector.y).toBe(3);
            expect(vector.z).toBe(4);
        });
    });
    describe("toString", () => {
        it("returns a formatted string representation", () => {
            const m = new IgeMatrix4_1.IgeMatrix4();
            const str = m.toString();
            expect(str).toContain("1.000");
            expect(str).toContain("0.000");
        });
    });
});
