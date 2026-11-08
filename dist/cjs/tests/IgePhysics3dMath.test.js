"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeEntity_1 = require("../engine/core/IgeEntity.js");
const IgeMatrix4_1 = require("../engine/core/IgeMatrix4.js");
const instance_1 = require("../engine/instance.js");
const IgePhysics3d_1 = require("../engine/physics/IgePhysics3d.js");
// updateTransform() builds 3D world matrices when the renderer is the WebGL one
beforeAll(() => {
    Object.defineProperty(instance_1.ige, "engine", {
        value: { renderer: () => ({ classId: "IgeWebGlRenderer" }) },
        configurable: true,
        writable: true
    });
});
/** Quaternion for a rotation of angle radians around a unit axis. */
function axisAngle(x, y, z, angle) {
    const s = Math.sin(angle / 2);
    return { x: x * s, y: y * s, z: z * s, w: Math.cos(angle / 2) };
}
function expectClose(actual, expected) {
    for (let i = 0; i < expected.length; i++)
        expect(actual[i]).toBeCloseTo(expected[i], 5);
}
describe("physics math", () => {
    it("rotates vectors by quaternions", () => {
        const q = axisAngle(0, 1, 0, Math.PI / 2); // +X turns to -Z
        const v = (0, IgePhysics3d_1.rotateVector)({ x: 1, y: 0, z: 0 }, q.x, q.y, q.z, q.w);
        expectClose([v.x, v.y, v.z], [0, 0, -1]);
    });
    it("matches IgeMatrix4 rotations and converts matrices back to quaternions", () => {
        const q = (0, IgePhysics3d_1.multiplyQuat)(axisAngle(0, 1, 0, 0.7), axisAngle(1, 0, 0, -0.4));
        const fromQuat = new IgeMatrix4_1.IgeMatrix4().translateBy(5, 6, 7).rotateByQuaternion(q.x, q.y, q.z, q.w).scaleBy(2, 2, 2);
        const fromEuler = new IgeMatrix4_1.IgeMatrix4().translateBy(5, 6, 7).rotateYBy(0.7).rotateXBy(-0.4).scaleBy(2, 2, 2);
        expectClose(fromQuat.matrix, fromEuler.matrix);
        const back = (0, IgePhysics3d_1.matrixToQuaternion)(fromQuat.matrix);
        const sign = Math.sign(back.w) === Math.sign(q.w) ? 1 : -1;
        expectClose([back.x * sign, back.y * sign, back.z * sign, back.w * sign], [q.x, q.y, q.z, q.w]);
        // A half turn (trace < 0 branch)
        const half = axisAngle(0, 0, 1, Math.PI);
        const m = new IgeMatrix4_1.IgeMatrix4().rotateByQuaternion(half.x, half.y, half.z, half.w);
        const halfBack = (0, IgePhysics3d_1.matrixToQuaternion)(m.matrix);
        expect(Math.abs(halfBack.z)).toBeCloseTo(1, 5);
    });
    it("uses an entity's quaternion instead of its Euler rotation, and notices changes", () => {
        const entity = new IgeEntity_1.IgeEntity().translateTo(10, 0, 0).rotateTo(0, 1.2, 0);
        entity.updateTransform();
        const euler = Array.from(entity._worldMatrix4.matrix);
        const q = axisAngle(1, 0, 0, Math.PI / 2);
        entity.quaternion(q);
        entity.updateTransform();
        const expected = new IgeMatrix4_1.IgeMatrix4().translateBy(10, 0, 0).rotateByQuaternion(q.x, q.y, q.z, q.w);
        expectClose(entity._worldMatrix4.matrix, expected.matrix);
        // Changing the quaternion rebuilds the transform; clearing it restores rotate()
        const version = entity._transformVersion;
        entity.quaternion(axisAngle(0, 0, 1, 0.3));
        entity.updateTransform();
        expect(entity._transformVersion).toBeGreaterThan(version);
        entity.quaternion(null);
        entity.updateTransform();
        expectClose(entity._worldMatrix4.matrix, euler);
    });
});
