import type { b2Manifold } from "../engine/components/physics/box2d/lib/collision/b2_collision.js"
import type { b2Contact } from "../engine/components/physics/box2d/lib/dynamics/b2_contact.js"
import type { b2ContactImpulse } from "../engine/components/physics/box2d/lib/dynamics/b2_world_callbacks.js"
export type IgeBox2dContactPreSolveCallback = (contact: b2Contact, oldManifold: b2Manifold) => void;
export type IgeBox2dContactPostSolveCallback = (contact: b2Contact, impulse: b2ContactImpulse) => void;
