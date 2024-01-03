import { b2Transform } from "../common/b2_math.js"
import { b2Manifold } from "./b2_collision.js"
import { b2CircleShape } from "./b2_circle_shape.js"
import { b2PolygonShape } from "./b2_polygon_shape.js"
export declare function b2CollideCircles(manifold: b2Manifold, circleA: b2CircleShape, xfA: b2Transform, circleB: b2CircleShape, xfB: b2Transform): void;
export declare function b2CollidePolygonAndCircle(manifold: b2Manifold, polygonA: b2PolygonShape, xfA: b2Transform, circleB: b2CircleShape, xfB: b2Transform): void;
