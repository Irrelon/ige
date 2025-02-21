import { b2Controller } from "./b2_controller.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2TimeStep } from "../dynamics/b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
/**
 * Calculates buoyancy forces for fluids in the form of a half
 * plane.
 */
export declare class b2BuoyancyController extends b2Controller {
    /**
     * The outer surface normal
     */
    readonly normal: b2Vec2;
    /**
     * The height of the fluid surface along the normal
     */
    offset: number;
    /**
     * The fluid density
     */
    density: number;
    /**
     * Fluid velocity, for drag calculations
     */
    readonly velocity: b2Vec2;
    /**
     * Linear drag co-efficient
     */
    linearDrag: number;
    /**
     * Angular drag co-efficient
     */
    angularDrag: number;
    /**
     * If false, bodies are assumed to be uniformly dense, otherwise
     * use the shapes densities
     */
    useDensity: boolean;
    /**
     * If true, gravity is taken from the world instead of the
     */
    useWorldGravity: boolean;
    /**
     * Gravity vector, if the world's gravity is not used
     */
    readonly gravity: b2Vec2;
    Step(step: b2TimeStep): void;
    Draw(debugDraw: b2Draw): void;
}
