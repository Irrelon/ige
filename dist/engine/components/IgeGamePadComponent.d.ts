import type { IgeEngine } from "../core/IgeEngine.js"
import { IgeComponent } from "../core/IgeComponent";
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour.js"
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
