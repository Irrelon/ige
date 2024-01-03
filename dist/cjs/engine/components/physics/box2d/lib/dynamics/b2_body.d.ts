import { b2Vec2, b2Transform, b2Sweep, XY } from "../common/b2_math.js"
import { b2Shape, b2MassData } from "../collision/b2_shape.js"
import { b2ContactEdge } from "./b2_contact.js"
import { b2JointEdge } from "./b2_joint.js"
import { b2Fixture, b2IFixtureDef } from "./b2_fixture.js"
import { b2World } from "./b2_world.js"
import { b2ControllerEdge } from "../controllers/b2_controller.js"
export declare enum b2BodyType {
    b2_unknown = -1,
    b2_staticBody = 0,
    b2_kinematicBody = 1,
    b2_dynamicBody = 2
}
export interface b2IBodyDef {
    type?: b2BodyType;
    position?: XY;
    angle?: number;
    linearVelocity?: XY;
    angularVelocity?: number;
    linearDamping?: number;
    angularDamping?: number;
    allowSleep?: boolean;
    awake?: boolean;
    fixedRotation?: boolean;
    bullet?: boolean;
    enabled?: boolean;
    userData?: any;
    gravityScale?: number;
}
export declare class b2BodyDef implements b2IBodyDef {
    type: b2BodyType;
    readonly position: b2Vec2;
    angle: number;
    readonly linearVelocity: b2Vec2;
    angularVelocity: number;
    linearDamping: number;
    angularDamping: number;
    allowSleep: boolean;
    awake: boolean;
    fixedRotation: boolean;
    bullet: boolean;
    enabled: boolean;
    userData: any;
    gravityScale: number;
}
export declare class b2Body {
    m_type: b2BodyType;
    m_islandFlag: boolean;
    m_awakeFlag: boolean;
    m_autoSleepFlag: boolean;
    m_bulletFlag: boolean;
    m_fixedRotationFlag: boolean;
    m_enabledFlag: boolean;
    m_toiFlag: boolean;
    m_islandIndex: number;
    readonly m_xf: b2Transform;
    readonly m_xf0: b2Transform;
    readonly m_sweep: b2Sweep;
    readonly m_linearVelocity: b2Vec2;
    m_angularVelocity: number;
    readonly m_force: b2Vec2;
    m_torque: number;
    m_world: b2World;
    m_prev: b2Body | null;
    m_next: b2Body | null;
    m_fixtureList: b2Fixture | null;
    m_fixtureCount: number;
    m_jointList: b2JointEdge | null;
    m_contactList: b2ContactEdge | null;
    m_mass: number;
    m_invMass: number;
    m_I: number;
    m_invI: number;
    m_linearDamping: number;
    m_angularDamping: number;
    m_gravityScale: number;
    m_sleepTime: number;
    m_userData: any;
    m_controllerList: b2ControllerEdge | null;
    m_controllerCount: number;
    constructor(bd: b2IBodyDef, world: b2World);
    CreateFixture(def: b2IFixtureDef): b2Fixture;
    CreateFixture(shape: b2Shape): b2Fixture;
    CreateFixture(shape: b2Shape, density: number): b2Fixture;
    CreateFixtureDef(def: b2IFixtureDef): b2Fixture;
    private static CreateFixtureShapeDensity_s_def;
    CreateFixtureShapeDensity(shape: b2Shape, density?: number): b2Fixture;
    DestroyFixture(fixture: b2Fixture): void;
    SetTransformVec(position: XY, angle: number): void;
    SetTransformXY(x: number, y: number, angle: number): void;
    SetTransform(xf: b2Transform): void;
    GetTransform(): Readonly<b2Transform>;
    GetPosition(): Readonly<b2Vec2>;
    SetPosition(position: XY): void;
    SetPositionXY(x: number, y: number): void;
    GetAngle(): number;
    SetAngle(angle: number): void;
    GetWorldCenter(): Readonly<b2Vec2>;
    GetLocalCenter(): Readonly<b2Vec2>;
    SetLinearVelocity(v: XY): void;
    GetLinearVelocity(): Readonly<b2Vec2>;
    SetAngularVelocity(w: number): void;
    GetAngularVelocity(): number;
    GetDefinition(bd: b2BodyDef): b2BodyDef;
    ApplyForce(force: XY, point: XY, wake?: boolean): void;
    ApplyForceToCenter(force: XY, wake?: boolean): void;
    ApplyTorque(torque: number, wake?: boolean): void;
    ApplyLinearImpulse(impulse: XY, point: XY, wake?: boolean): void;
    ApplyLinearImpulseToCenter(impulse: XY, wake?: boolean): void;
    ApplyAngularImpulse(impulse: number, wake?: boolean): void;
    GetMass(): number;
    GetInertia(): number;
    GetMassData(data: b2MassData): b2MassData;
    private static SetMassData_s_oldCenter;
    SetMassData(massData: b2MassData): void;
    private static ResetMassData_s_localCenter;
    private static ResetMassData_s_oldCenter;
    private static ResetMassData_s_massData;
    ResetMassData(): void;
    GetWorldPoint<T extends XY>(localPoint: XY, out: T): T;
    GetWorldVector<T extends XY>(localVector: XY, out: T): T;
    GetLocalPoint<T extends XY>(worldPoint: XY, out: T): T;
    GetLocalVector<T extends XY>(worldVector: XY, out: T): T;
    GetLinearVelocityFromWorldPoint<T extends XY>(worldPoint: XY, out: T): T;
    GetLinearVelocityFromLocalPoint<T extends XY>(localPoint: XY, out: T): T;
    GetLinearDamping(): number;
    SetLinearDamping(linearDamping: number): void;
    GetAngularDamping(): number;
    SetAngularDamping(angularDamping: number): void;
    GetGravityScale(): number;
    SetGravityScale(scale: number): void;
    SetType(type: b2BodyType): void;
    GetType(): b2BodyType;
    SetBullet(flag: boolean): void;
    IsBullet(): boolean;
    SetSleepingAllowed(flag: boolean): void;
    IsSleepingAllowed(): boolean;
    SetAwake(flag: boolean): void;
    IsAwake(): boolean;
    SetEnabled(flag: boolean): void;
    IsEnabled(): boolean;
    SetFixedRotation(flag: boolean): void;
    IsFixedRotation(): boolean;
    GetFixtureList(): b2Fixture | null;
    GetJointList(): b2JointEdge | null;
    GetContactList(): b2ContactEdge | null;
    GetNext(): b2Body | null;
    GetUserData(): any;
    SetUserData(data: any): void;
    GetWorld(): b2World;
    Dump(log: (format: string, ...args: any[]) => void): void;
    private static SynchronizeFixtures_s_xf1;
    SynchronizeFixtures(): void;
    SynchronizeTransform(): void;
    ShouldCollide(other: b2Body): boolean;
    ShouldCollideConnected(other: b2Body): boolean;
    Advance(alpha: number): void;
    GetControllerList(): b2ControllerEdge | null;
    GetControllerCount(): number;
}
