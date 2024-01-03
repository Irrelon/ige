import type { b2Contact } from "@/engine/components/physics/box2d/lib/dynamics/b2_contact";

export type IgeBox2dContactListenerCallback = (contact: b2Contact) => void;
