import type { b2Transform } from "../common/b2_math.js"
import type { b2Manifold } from "../collision/b2_collision.js"
import type { b2ChainShape } from "../collision/b2_chain_shape.js"
import type { b2CircleShape } from "../collision/b2_circle_shape.js"
import { b2Contact } from "./b2_contact.js"
export declare class b2ChainAndCircleContact extends b2Contact<b2ChainShape, b2CircleShape> {
    static Create(): b2Contact;
    static Destroy(contact: b2Contact): void;
    private static Evaluate_s_edge;
    Evaluate(manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void;
}
