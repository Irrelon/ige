import { b2Controller } from "./b2_controller.js"
import type { b2TimeStep } from "../dynamics/b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
/**
 * Applies simplified gravity between every pair of bodies
 */
export declare class b2GravityController extends b2Controller {
    /**
     * Specifies the strength of the gravitiation force
     */
    G: number;
    /**
     * If true, gravity is proportional to r^-2, otherwise r^-1
     */
    invSqr: boolean;
    /**
     * @see b2Controller::Step
     */
    Step(step: b2TimeStep): void;
    private static Step_s_f;
    Draw(draw: b2Draw): void;
}
