import { b2Transform } from "../common/b2_math.js"
import { b2Manifold } from "./b2_collision.js"
import { b2CircleShape } from "./b2_circle_shape.js"
import { b2PolygonShape } from "./b2_polygon_shape.js"
import { b2EdgeShape } from "./b2_edge_shape.js"
export declare function b2CollideEdgeAndCircle(manifold: b2Manifold, edgeA: b2EdgeShape, xfA: b2Transform, circleB: b2CircleShape, xfB: b2Transform): void;
export declare function b2CollideEdgeAndPolygon(manifold: b2Manifold, edgeA: b2EdgeShape, xfA: b2Transform, polygonB: b2PolygonShape, xfB: b2Transform): void;
