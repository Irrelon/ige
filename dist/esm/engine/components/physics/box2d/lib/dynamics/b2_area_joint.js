// DEBUG: import { b2Assert } from "../common/b2_settings.js"
import { b2_epsilon, b2_linearSlop, b2_maxLinearCorrection, b2MakeNumberArray, b2Maybe } from "../common/b2_settings.js"
import { b2Sq, b2Sqrt, b2Vec2 } from "../common/b2_math.js"
import { b2Joint, b2JointDef, b2JointType } from "./b2_joint.js"
import { b2DistanceJointDef } from "./b2_distance_joint.js"
export class b2AreaJointDef extends b2JointDef {
    bodies = [];
    stiffness = 0;
    damping = 0;
    constructor() {
        super(b2JointType.e_areaJoint);
    }
    AddBody(body) {
        this.bodies.push(body);
        if (this.bodies.length === 1) {
            this.bodyA = body;
        }
        else if (this.bodies.length === 2) {
            this.bodyB = body;
        }
    }
}
export class b2AreaJoint extends b2Joint {
    m_bodies;
    m_stiffness = 0;
    m_damping = 0;
    // Solver shared
    m_impulse = 0;
    // Solver temp
    m_targetLengths;
    m_targetArea = 0;
    m_normals;
    m_joints;
    m_deltas;
    m_delta = new b2Vec2();
    constructor(def) {
        super(def);
        // DEBUG: b2Assert(def.bodies.length >= 3, "You cannot create an area joint with less than three bodies.");
        this.m_bodies = def.bodies;
        this.m_stiffness = b2Maybe(def.stiffness, 0);
        this.m_damping = b2Maybe(def.damping, 0);
        this.m_targetLengths = b2MakeNumberArray(def.bodies.length);
        this.m_normals = b2Vec2.MakeArray(def.bodies.length);
        this.m_joints = []; // b2MakeNullArray(def.bodies.length);
        this.m_deltas = b2Vec2.MakeArray(def.bodies.length);
        const djd = new b2DistanceJointDef();
        djd.stiffness = this.m_stiffness;
        djd.damping = this.m_damping;
        this.m_targetArea = 0;
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const body = this.m_bodies[i];
            const next = this.m_bodies[(i + 1) % this.m_bodies.length];
            const body_c = body.GetWorldCenter();
            const next_c = next.GetWorldCenter();
            this.m_targetLengths[i] = b2Vec2.DistanceVV(body_c, next_c);
            this.m_targetArea += b2Vec2.CrossVV(body_c, next_c);
            djd.Initialize(body, next, body_c, next_c);
            this.m_joints[i] = body.GetWorld().CreateJoint(djd);
        }
        this.m_targetArea *= 0.5;
    }
    GetAnchorA(out) {
        return out;
    }
    GetAnchorB(out) {
        return out;
    }
    GetReactionForce(inv_dt, out) {
        return out;
    }
    GetReactionTorque(inv_dt) {
        return 0;
    }
    SetStiffness(stiffness) {
        this.m_stiffness = stiffness;
        for (let i = 0; i < this.m_joints.length; ++i) {
            this.m_joints[i].SetStiffness(stiffness);
        }
    }
    GetStiffness() {
        return this.m_stiffness;
    }
    SetDamping(damping) {
        this.m_damping = damping;
        for (let i = 0; i < this.m_joints.length; ++i) {
            this.m_joints[i].SetDamping(damping);
        }
    }
    GetDamping() {
        return this.m_damping;
    }
    Dump(log) {
        log("Area joint dumping is not supported.\n");
    }
    InitVelocityConstraints(data) {
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const prev = this.m_bodies[(i + this.m_bodies.length - 1) % this.m_bodies.length];
            const next = this.m_bodies[(i + 1) % this.m_bodies.length];
            const prev_c = data.positions[prev.m_islandIndex].c;
            const next_c = data.positions[next.m_islandIndex].c;
            const delta = this.m_deltas[i];
            b2Vec2.SubVV(next_c, prev_c, delta);
        }
        if (data.step.warmStarting) {
            this.m_impulse *= data.step.dtRatio;
            for (let i = 0; i < this.m_bodies.length; ++i) {
                const body = this.m_bodies[i];
                const body_v = data.velocities[body.m_islandIndex].v;
                const delta = this.m_deltas[i];
                body_v.x += body.m_invMass * delta.y * 0.5 * this.m_impulse;
                body_v.y += body.m_invMass * -delta.x * 0.5 * this.m_impulse;
            }
        }
        else {
            this.m_impulse = 0;
        }
    }
    SolveVelocityConstraints(data) {
        let dotMassSum = 0;
        let crossMassSum = 0;
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const body = this.m_bodies[i];
            const body_v = data.velocities[body.m_islandIndex].v;
            const delta = this.m_deltas[i];
            dotMassSum += delta.LengthSquared() / body.GetMass();
            crossMassSum += b2Vec2.CrossVV(body_v, delta);
        }
        const lambda = -2 * crossMassSum / dotMassSum;
        // lambda = b2Clamp(lambda, -b2_maxLinearCorrection, b2_maxLinearCorrection);
        this.m_impulse += lambda;
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const body = this.m_bodies[i];
            const body_v = data.velocities[body.m_islandIndex].v;
            const delta = this.m_deltas[i];
            body_v.x += body.m_invMass * delta.y * 0.5 * lambda;
            body_v.y += body.m_invMass * -delta.x * 0.5 * lambda;
        }
    }
    SolvePositionConstraints(data) {
        let perimeter = 0;
        let area = 0;
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const body = this.m_bodies[i];
            const next = this.m_bodies[(i + 1) % this.m_bodies.length];
            const body_c = data.positions[body.m_islandIndex].c;
            const next_c = data.positions[next.m_islandIndex].c;
            const delta = b2Vec2.SubVV(next_c, body_c, this.m_delta);
            let dist = delta.Length();
            if (dist < b2_epsilon) {
                dist = 1;
            }
            this.m_normals[i].x = delta.y / dist;
            this.m_normals[i].y = -delta.x / dist;
            perimeter += dist;
            area += b2Vec2.CrossVV(body_c, next_c);
        }
        area *= 0.5;
        const deltaArea = this.m_targetArea - area;
        const toExtrude = 0.5 * deltaArea / perimeter;
        let done = true;
        for (let i = 0; i < this.m_bodies.length; ++i) {
            const body = this.m_bodies[i];
            const body_c = data.positions[body.m_islandIndex].c;
            const next_i = (i + 1) % this.m_bodies.length;
            const delta = b2Vec2.AddVV(this.m_normals[i], this.m_normals[next_i], this.m_delta);
            delta.SelfMul(toExtrude);
            const norm_sq = delta.LengthSquared();
            if (norm_sq > b2Sq(b2_maxLinearCorrection)) {
                delta.SelfMul(b2_maxLinearCorrection / b2Sqrt(norm_sq));
            }
            if (norm_sq > b2Sq(b2_linearSlop)) {
                done = false;
            }
            body_c.x += delta.x;
            body_c.y += delta.y;
        }
        return done;
    }
}
