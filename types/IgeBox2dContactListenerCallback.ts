import type { Box2D } from "../engine/components/physics/box2d/lib_box2d";

export type IgeBox2dContactListenerCallback = (contact: Box2D.Dynamics.Contacts.b2Contact) => void;
