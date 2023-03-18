import { Box2D } from "../engine/components/physics/box2d/lib_box2d";

export type IgeBox2dContactPreSolveCallback = (contact: Box2D.Dynamics.Contacts.b2Contact, oldManifold: Box2D.Collision.b2Manifold) => void;
export type IgeBox2dContactPostSolveCallback = (contact: Box2D.Dynamics.Contacts.b2Contact, impulse: Box2D.Dynamics.b2ContactImpulse) => void;
