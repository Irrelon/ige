import type { IgeEngine } from "../../export/exports.js"
import { IgeComponent } from "../../export/exports.js"
import type { IgeEntity } from "../../export/exports.js"
import type { IgeEntityBehaviourMethod } from "../../export/exports.js"
export declare class IgeGamePadComponent extends IgeComponent<IgeEngine> {
    "classId": string;
    "componentId": string;
    gamepadAvailable: boolean | null;
    TYPICAL_BUTTON_COUNT: number;
    TYPICAL_AXIS_COUNT: number;
    ticking: boolean;
    gamepads: Gamepad[];
    prevRawGamepadTypes: never[];
    prevTimestamps: never[];
    constructor(entity: IgeEntity, options?: any);
    onGamepadConnect(event: GamepadEvent): void;
    /**
     * React to the gamepad being disconnected.
     */
    onGamepadDisconnect(event: GamepadEvent): void;
    /**
     * A function called with each requestAnimationFrame(). Polls the gamepad
     * status and schedules another poll.
     */
    _behaviour: IgeEntityBehaviourMethod;
}
