import { b2Transform } from "../common/b2_math.js"
import type { b2Manifold } from "./b2_collision.js"
import type { b2PolygonShape } from "./b2_polygon_shape.js"
export declare function b2CollidePolygons(manifold: b2Manifold, polyA: b2PolygonShape, xfA: b2Transform, polyB: b2PolygonShape, xfB: b2Transform): void;
