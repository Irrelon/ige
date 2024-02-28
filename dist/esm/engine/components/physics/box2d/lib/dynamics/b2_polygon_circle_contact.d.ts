import type { b2Transform } from "../common/b2_math.js"
import type { b2Manifold } from "../collision/b2_collision.js"
import type { b2CircleShape } from "../collision/b2_circle_shape.js"
import type { b2PolygonShape } from "../collision/b2_polygon_shape.js"
import { b2Contact } from "./b2_contact.js"
export declare class b2PolygonAndCircleContact extends b2Contact<b2PolygonShape, b2CircleShape> {
    static Create(): b2Contact;
    static Destroy(contact: b2Contact): void;
    Evaluate(manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void;
}
