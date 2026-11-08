"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRagdoll3d = void 0;
exports.autoRagdollParts = autoRagdollParts;
const IgeRaycast_1 = require("../webgl/IgeRaycast.js");
const IgeAnimationRetarget_1 = require("../webgl/IgeAnimationRetarget.js");
/** a * b for column-major 4x4 matrices, into out (which may not alias a or b). */
function multiply(out, a, b) {
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] +
                a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
        }
    }
    return out;
}
/** A rigid transform from a position and a unit quaternion. */
function compose(out, px, py, pz, x, y, z, w) {
    const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    out[0] = 1 - 2 * (yy + zz);
    out[1] = 2 * (xy + wz);
    out[2] = 2 * (xz - wy);
    out[3] = 0;
    out[4] = 2 * (xy - wz);
    out[5] = 1 - 2 * (xx + zz);
    out[6] = 2 * (yz + wx);
    out[7] = 0;
    out[8] = 2 * (xz + wy);
    out[9] = 2 * (yz - wx);
    out[10] = 1 - 2 * (xx + yy);
    out[11] = 0;
    out[12] = px;
    out[13] = py;
    out[14] = pz;
    out[15] = 1;
    return out;
}
/** The rotation taking +Y to the unit direction d. */
function quatFromUp(d) {
    if (d.y < -0.9999)
        return { x: 1, y: 0, z: 0, w: 0 };
    const x = d.z, y = 0, z = -d.x, w = 1 + d.y;
    const len = Math.hypot(x, y, z, w);
    return { x: x / len, y: y / len, z: z / len, w: w / len };
}
/** Bones in parent-before-child order. */
function hierarchyOrder(skeleton) {
    const order = [];
    const visit = (index) => {
        order.push(index);
        for (const child of skeleton.data.bones[index].childIndices)
            visit(child);
    };
    for (const root of skeleton.data.rootBoneIndices)
        visit(root);
    return order;
}
/** World (IGE) positions of every joint: entity world * bone model matrix. */
function jointPositions(entity, skeleton) {
    const e = entity._worldMatrix4.matrix;
    const w = skeleton.worldMatrices;
    const out = [];
    for (let b = 0; b < skeleton.data.boneCount; b++) {
        const x = w[b * 16 + 12], y = w[b * 16 + 13], z = w[b * 16 + 14];
        out.push({
            x: e[0] * x + e[4] * y + e[8] * z + e[12],
            y: e[1] * x + e[5] * y + e[9] * z + e[13],
            z: e[2] * x + e[6] * y + e[10] * z + e[14]
        });
    }
    return out;
}
/**
 * Ragdoll parts for a skeleton when none are given: one capsule per bone
 * with children, ending at the child that continues the bone's direction
 * (the spine rather than an arm), skipping segments shorter than 8% of
 * the skeleton's height. Characters usually look better with parts chosen
 * by hand (head, hands), but this works for any rig.
 */
function autoRagdollParts(entity) {
    const skeleton = entity._skeleton;
    if (!skeleton || !entity._worldMatrix4)
        return [];
    entity._updateSkeletonMatrices();
    const joints = jointPositions(entity, skeleton);
    const bones = skeleton.data.bones;
    const minY = Math.min(...joints.map((j) => j.y)), maxY = Math.max(...joints.map((j) => j.y));
    const minLength = (maxY - minY) * 0.08;
    const parts = [];
    for (const bone of bones) {
        if (!bone.childIndices.length)
            continue;
        const p = joints[bone.index];
        const parent = bone.parentIndex >= 0 ? joints[bone.parentIndex] : { x: p.x, y: p.y - 1, z: p.z };
        const along = { x: p.x - parent.x, y: p.y - parent.y, z: p.z - parent.z };
        const alongLength = Math.hypot(along.x, along.y, along.z) || 1;
        let best = -1, bestScore = -Infinity;
        for (const child of bone.childIndices) {
            const c = joints[child];
            const dx = c.x - p.x, dy = c.y - p.y, dz = c.z - p.z;
            const len = Math.hypot(dx, dy, dz) || 1;
            const score = (dx * along.x + dy * along.y + dz * along.z) / (len * alongLength);
            if (score > bestScore) {
                bestScore = score;
                best = child;
            }
        }
        const end = joints[best];
        if (Math.hypot(end.x - p.x, end.y - p.y, end.z - p.z) < minLength)
            continue;
        parts.push({ bone: bone.name, to: bones[best].name });
    }
    return parts;
}
let nextGroupId = 1;
/**
 * A ragdoll made from a skinned entity's skeleton: a capsule body per part,
 * joined with swing-twist joints, that drives the skeleton every step so
 * the character falls and tumbles as physics dictates. The entity's
 * animation is stopped while it lasts. Create it with
 * IgePhysics3d.createRagdoll(), e.g. when a character dies.
 */
class IgeRagdoll3d {
    constructor(physics, entity, options = {}) {
        var _a, _b, _c, _d;
        this._parts = [];
        this._constraints = [];
        this._scratch = new Float32Array(16);
        this._scratch2 = new Float32Array(16);
        this._entityInverse = new Float32Array(16);
        this._parentInverse = new Float32Array(16);
        this._destroyed = false;
        this._physics = physics;
        this.entity = entity;
        const skeleton = entity._skeleton;
        if (!skeleton)
            throw new Error("IgeRagdoll3d: the entity has no skeleton (give it a skinned model)");
        entity.updateTransform();
        entity._updateSkeletonMatrices();
        (_a = entity.skeletalAnimation()) === null || _a === void 0 ? void 0 : _a.stop();
        const jolt = physics._jolt;
        const u = physics.unitsPerMetre();
        const bones = skeleton.data.bones;
        const joints = jointPositions(entity, skeleton);
        const parts = ((_b = options.parts) === null || _b === void 0 ? void 0 : _b.length) ? options.parts : autoRagdollParts(entity);
        const entityWorld = entity._worldMatrix4.matrix;
        this._order = hierarchyOrder(skeleton);
        this._partOfBone = new Int32Array(skeleton.data.boneCount).fill(-1);
        this._frozenLocal = new Float32Array(skeleton.localMatrices);
        this._model = new Float32Array(skeleton.data.boneCount * 16);
        // Parts don't collide with each other (capsules overlap at the joints)
        const filter = new jolt.GroupFilterTable(Math.max(1, parts.length));
        for (let i = 0; i < parts.length; i++) {
            for (let j = i + 1; j < parts.length; j++)
                filter.DisableCollision(i, j);
        }
        const groupId = nextGroupId++;
        const velocity = options.velocity;
        const directions = [];
        const lengths = [];
        parts.forEach((part, partIndex) => {
            var _a, _b, _c;
            const boneIndex = (0, IgeAnimationRetarget_1.findBoneIndex)(skeleton.data, part.bone);
            if (boneIndex < 0)
                throw new Error(`IgeRagdoll3d: no bone "${part.bone}"`);
            const start = joints[boneIndex];
            // Direction and length of the part
            let dir, length;
            const toIndex = part.to ? (0, IgeAnimationRetarget_1.findBoneIndex)(skeleton.data, part.to) : -1;
            if (toIndex >= 0) {
                const end = joints[toIndex];
                dir = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
                length = Math.hypot(dir.x, dir.y, dir.z);
            }
            else {
                // Along the parent part (or the parent bone, or up)
                let parentDir = { x: 0, y: 1, z: 0 };
                let parentLength = 0;
                for (let b = bones[boneIndex].parentIndex; b >= 0; b = bones[b].parentIndex) {
                    const owner = this._partOfBone[b];
                    if (owner >= 0) {
                        parentDir = directions[owner];
                        parentLength = lengths[owner];
                        break;
                    }
                }
                dir = Object.assign({}, parentDir);
                length = (_a = part.length) !== null && _a !== void 0 ? _a : Math.max(parentLength * 0.6, 1);
            }
            length = Math.max(length, 1e-3);
            dir = { x: dir.x / length, y: dir.y / length, z: dir.z / length };
            directions.push(dir);
            lengths.push(length);
            const radius = Math.max((_b = part.radius) !== null && _b !== void 0 ? _b : length * 0.3, 0.5);
            const halfHeight = Math.max(length / 2, 0.01);
            const centre = { x: start.x + dir.x * length / 2, y: start.y + dir.y * length / 2, z: start.z + dir.z * length / 2 };
            const q = quatFromUp(dir);
            const shape = new jolt.CapsuleShape(halfHeight / u, radius / u, undefined);
            physics._rvec.Set(centre.x / u, centre.y / u, centre.z / u);
            physics._quat.Set(q.x, q.y, q.z, q.w);
            const settings = new jolt.BodyCreationSettings(shape, physics._rvec, physics._quat, jolt.EMotionType_Dynamic, 1 /* moving layer */);
            settings.mFriction = (_c = options.friction) !== null && _c !== void 0 ? _c : 0.6;
            settings.mLinearDamping = 0.1;
            settings.mAngularDamping = 0.3;
            const group = new jolt.CollisionGroup(filter, groupId, partIndex);
            settings.mCollisionGroup = group;
            jolt.destroy(group);
            const body = physics._bodies.CreateBody(settings);
            jolt.destroy(settings);
            physics._bodies.AddBody(body.GetID(), jolt.EActivation_Activate);
            if (velocity) {
                physics._vec.Set(velocity.x / u, velocity.y / u, velocity.z / u);
                physics._bodies.SetLinearVelocity(body.GetID(), physics._vec);
            }
            // Bone world (IGE units) relative to the body
            const boneWorld = multiply(new Float32Array(16), entityWorld, skeleton.worldMatrices.subarray(boneIndex * 16, boneIndex * 16 + 16));
            const bodyWorld = compose(new Float32Array(16), centre.x, centre.y, centre.z, q.x, q.y, q.z, q.w);
            const offset = multiply(new Float32Array(16), (0, IgeRaycast_1.invertMat4)(bodyWorld), boneWorld);
            this._partOfBone[boneIndex] = partIndex;
            this._parts.push({ boneIndex, body, offset });
        });
        // Join each part to the nearest part above it at its base joint
        const swing = (((_c = options.swingLimit) !== null && _c !== void 0 ? _c : 50) * Math.PI) / 180;
        const twist = (((_d = options.twistLimit) !== null && _d !== void 0 ? _d : 25) * Math.PI) / 180;
        this._parts.forEach((part, partIndex) => {
            let parentPart = -1;
            for (let b = bones[part.boneIndex].parentIndex; b >= 0 && parentPart < 0; b = bones[b].parentIndex) {
                parentPart = this._partOfBone[b];
            }
            if (parentPart < 0)
                return;
            const joint = joints[part.boneIndex];
            const axis = directions[partIndex];
            // Any axis perpendicular to the part: up x axis, or forward x axis for vertical parts
            let px = axis.z, py = 0, pz = -axis.x;
            let plen = Math.hypot(px, py, pz);
            if (plen < 1e-3) {
                px = 0;
                py = -axis.z;
                pz = axis.y;
                plen = Math.hypot(px, py, pz);
            }
            px /= plen;
            py /= plen;
            pz /= plen;
            const c = new jolt.SwingTwistConstraintSettings();
            c.mSpace = jolt.EConstraintSpace_WorldSpace;
            physics._rvec.Set(joint.x / u, joint.y / u, joint.z / u);
            c.mPosition1 = physics._rvec;
            c.mPosition2 = physics._rvec;
            physics._vec.Set(axis.x, axis.y, axis.z);
            c.mTwistAxis1 = physics._vec;
            c.mTwistAxis2 = physics._vec;
            physics._vec.Set(px, py, pz);
            c.mPlaneAxis1 = physics._vec;
            c.mPlaneAxis2 = physics._vec;
            c.mNormalHalfConeAngle = swing;
            c.mPlaneHalfConeAngle = swing;
            c.mTwistMinAngle = -twist;
            c.mTwistMaxAngle = twist;
            const constraint = c.Create(this._parts[parentPart].body, part.body);
            jolt.destroy(c);
            physics._system.AddConstraint(constraint);
            this._constraints.push(constraint);
        });
        this.sync();
    }
    /** Push the ragdoll: an impulse (kg * IGE units per second) on one part, or spread over all of them. */
    applyImpulse(x, y, z, partIndex) {
        const physics = this._physics;
        const u = physics.unitsPerMetre();
        const targets = partIndex === undefined ? this._parts : [this._parts[partIndex]];
        const share = partIndex === undefined ? 1 / this._parts.length : 1;
        physics._vec.Set((x * share) / u, (y * share) / u, (z * share) / u);
        for (const part of targets)
            physics._bodies.AddImpulse(part.body.GetID(), physics._vec);
        return this;
    }
    /** Whether every part has come to rest (Jolt has put them to sleep). */
    asleep() {
        return this._parts.every((part) => !part.body.IsActive());
    }
    /** Pose the skeleton from the bodies (IgePhysics3d calls this after every step). */
    sync() {
        const skeleton = this.entity._skeleton;
        if (!skeleton || this._destroyed)
            return;
        const u = this._physics.unitsPerMetre();
        const bones = skeleton.data.bones;
        const model = this._model;
        const local = skeleton.localMatrices;
        if (!(0, IgeRaycast_1.invertMat4)(this.entity._worldMatrix4.matrix, this._entityInverse))
            return;
        for (const b of this._order) {
            const bone = bones[b];
            const out = model.subarray(b * 16, b * 16 + 16);
            const partIndex = this._partOfBone[b];
            if (partIndex >= 0) {
                // Bone model matrix = entity^-1 * body * offset
                const part = this._parts[partIndex];
                const p = part.body.GetPosition(), r = part.body.GetRotation();
                compose(this._scratch, p.GetX() * u, p.GetY() * u, p.GetZ() * u, r.GetX(), r.GetY(), r.GetZ(), r.GetW());
                multiply(this._scratch2, this._scratch, part.offset);
                multiply(out, this._entityInverse, this._scratch2);
                // Matching local matrix, so the skeleton's own update agrees
                const parentModel = bone.parentIndex >= 0 ? model.subarray(bone.parentIndex * 16, bone.parentIndex * 16 + 16) : bone.parentTransform;
                const target = local.subarray(b * 16, b * 16 + 16);
                if (parentModel && (0, IgeRaycast_1.invertMat4)(parentModel, this._parentInverse)) {
                    multiply(target, this._parentInverse, out);
                }
                else {
                    target.set(out);
                }
            }
            else {
                // Rigidly follow the parent with the pose the ragdoll started in
                const frozen = this._frozenLocal.subarray(b * 16, b * 16 + 16);
                local.set(frozen, b * 16);
                const parentModel = bone.parentIndex >= 0 ? model.subarray(bone.parentIndex * 16, bone.parentIndex * 16 + 16) : bone.parentTransform;
                if (parentModel)
                    multiply(out, parentModel, frozen);
                else
                    out.set(frozen);
            }
        }
        skeleton.dirty = true;
        this.entity._renderChanged();
    }
    /** Remove the bodies and joints; the skeleton stays in its last pose until animated again. */
    destroy() {
        this._physics.removeRagdoll(this);
    }
    _free() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        const physics = this._physics;
        for (const constraint of this._constraints)
            physics._system.RemoveConstraint(constraint);
        for (const part of this._parts) {
            const id = part.body.GetID();
            physics._bodies.RemoveBody(id);
            physics._bodies.DestroyBody(id);
        }
        this._constraints.length = 0;
        this._parts.length = 0;
    }
}
exports.IgeRagdoll3d = IgeRagdoll3d;
