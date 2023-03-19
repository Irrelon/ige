import { IgeComponent } from "../core/IgeComponent";
import { IgeEntity } from "../core/IgeEntity";
import { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import { IgeEngine } from "@/engine/core/IgeEngine";
export declare class IgeGamePadComponent extends IgeComponent<IgeEngine> {
    "classId": string;
    "componentId": string;
    gamepadAvailable: boolean | null;
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
