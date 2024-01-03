import { b2Vec2 } from "../common/b2_math.js"
import { b2Contact } from "./b2_contact.js"
import { b2ContactVelocityConstraint } from "./b2_contact_solver.js"
import { b2Joint } from "./b2_joint.js"
import { b2Body } from "./b2_body.js"
import { b2TimeStep, b2Profile, b2Position, b2Velocity } from "./b2_time_step.js"
import { b2ContactListener } from "./b2_world_callbacks.js"
export declare class b2Island {
    m_listener: b2ContactListener;
    readonly m_bodies: b2Body[];
    readonly m_contacts: b2Contact[];
    readonly m_joints: b2Joint[];
    readonly m_positions: b2Position[];
    readonly m_velocities: b2Velocity[];
    m_bodyCount: number;
    m_jointCount: number;
    m_contactCount: number;
    m_bodyCapacity: number;
    m_contactCapacity: number;
    m_jointCapacity: number;
    Initialize(bodyCapacity: number, contactCapacity: number, jointCapacity: number, listener: b2ContactListener): void;
    Clear(): void;
    AddBody(body: b2Body): void;
    AddContact(contact: b2Contact): void;
    AddJoint(joint: b2Joint): void;
    private static s_timer;
    private static s_solverData;
    private static s_contactSolverDef;
    private static s_contactSolver;
    private static s_translation;
    Solve(profile: b2Profile, step: b2TimeStep, gravity: b2Vec2, allowSleep: boolean): void;
    SolveTOI(subStep: b2TimeStep, toiIndexA: number, toiIndexB: number): void;
    private static s_impulse;
    Report(constraints: b2ContactVelocityConstraint[]): void;
}
