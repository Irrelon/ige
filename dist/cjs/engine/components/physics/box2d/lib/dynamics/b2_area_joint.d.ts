import type { XY } from "../common/b2_math.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2DistanceJoint } from "./b2_distance_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Body } from "./b2_body.js"
export interface b2IAreaJointDef extends b2IJointDef {
    bodies: b2Body[];
    stiffness?: number;
    damping?: number;
}
export declare class b2AreaJointDef extends b2JointDef implements b2IAreaJointDef {
    bodies: b2Body[];
    stiffness: number;
    damping: number;
    constructor();
    AddBody(body: b2Body): void;
}
export declare class b2AreaJoint extends b2Joint {
    m_bodies: b2Body[];
    m_stiffness: number;
    m_damping: number;
    m_impulse: number;
    readonly m_targetLengths: number[];
    m_targetArea: number;
    readonly m_normals: b2Vec2[];
    readonly m_joints: b2DistanceJoint[];
    readonly m_deltas: b2Vec2[];
    readonly m_delta: b2Vec2;
    constructor(def: b2IAreaJointDef);
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    SetStiffness(stiffness: number): void;
    GetStiffness(): number;
    SetDamping(damping: number): void;
    GetDamping(): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
    InitVelocityConstraints(data: b2SolverData): void;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
}
