import { b2Controller } from "./b2_controller.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2TimeStep } from "../dynamics/b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
/**
 * Applies a force every frame
 */
export declare class b2ConstantForceController extends b2Controller {
    /**
   * The force to apply
   */
    readonly F: b2Vec2;
    Step(step: b2TimeStep): void;
    Draw(draw: b2Draw): void;
}
