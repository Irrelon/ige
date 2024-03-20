import { b2Controller } from "./b2_controller.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2TimeStep } from "../dynamics/b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
/**
 * Applies a force every frame
 */
export declare class b2ConstantAccelController extends b2Controller {
    /**
     * The acceleration to apply
     */
    readonly A: b2Vec2;
    Step(step: b2TimeStep): void;
    private static Step_s_dtA;
    Draw(draw: b2Draw): void;
}
