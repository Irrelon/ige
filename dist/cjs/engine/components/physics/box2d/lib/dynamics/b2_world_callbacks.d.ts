import { b2Vec2 } from "../common/b2_math.js"
import { b2Manifold } from "../collision/b2_collision.js"
import { b2Contact } from "./b2_contact.js"
import { b2Joint } from "./b2_joint.js"
import { b2Fixture } from "./b2_fixture.js"
import { b2ParticleGroup } from "../particle/b2_particle_group.js"
import { b2ParticleSystem, b2ParticleContact, b2ParticleBodyContact } from "../particle/b2_particle_system.js"
export declare class b2DestructionListener {
    SayGoodbyeJoint(joint: b2Joint): void;
    SayGoodbyeFixture(fixture: b2Fixture): void;
    SayGoodbyeParticleGroup(group: b2ParticleGroup): void;
    SayGoodbyeParticle(system: b2ParticleSystem, index: number): void;
}
export declare class b2ContactFilter {
    ShouldCollide(fixtureA: b2Fixture, fixtureB: b2Fixture): boolean;
    ShouldCollideFixtureParticle(fixture: b2Fixture, system: b2ParticleSystem, index: number): boolean;
    ShouldCollideParticleParticle(system: b2ParticleSystem, indexA: number, indexB: number): boolean;
    static readonly b2_defaultFilter: b2ContactFilter;
}
export declare class b2ContactImpulse {
    normalImpulses: number[];
    tangentImpulses: number[];
    count: number;
}
export declare class b2ContactListener {
    BeginContact(contact: b2Contact): void;
    EndContact(contact: b2Contact): void;
    BeginContactFixtureParticle(system: b2ParticleSystem, contact: b2ParticleBodyContact): void;
    EndContactFixtureParticle(system: b2ParticleSystem, contact: b2ParticleBodyContact): void;
    BeginContactParticleParticle(system: b2ParticleSystem, contact: b2ParticleContact): void;
    EndContactParticleParticle(system: b2ParticleSystem, contact: b2ParticleContact): void;
    PreSolve(contact: b2Contact, oldManifold: b2Manifold): void;
    PostSolve(contact: b2Contact, impulse: b2ContactImpulse): void;
    static readonly b2_defaultListener: b2ContactListener;
}
export declare class b2QueryCallback {
    ReportFixture(fixture: b2Fixture): boolean;
    ReportParticle(system: b2ParticleSystem, index: number): boolean;
    ShouldQueryParticleSystem(system: b2ParticleSystem): boolean;
}
export type b2QueryCallbackFunction = (fixture: b2Fixture) => boolean;
export declare class b2RayCastCallback {
    ReportFixture(fixture: b2Fixture, point: b2Vec2, normal: b2Vec2, fraction: number): number;
    ReportParticle(system: b2ParticleSystem, index: number, point: b2Vec2, normal: b2Vec2, fraction: number): number;
    ShouldQueryParticleSystem(system: b2ParticleSystem): boolean;
}
export type b2RayCastCallbackFunction = (fixture: b2Fixture, point: b2Vec2, normal: b2Vec2, fraction: number) => number;
