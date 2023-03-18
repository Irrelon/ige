import IgeComponent from "../core/IgeComponent";
import IgeEntity from "../core/IgeEntity";
import { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour";
declare class IgeGamePadComponent extends IgeComponent {
    "classId": string;
    "componentId": string;
    gamepadAvailable: boolean | null;
    constructor(entity: IgeEntity, options?: any);
    "onGamepadConnect"(event: any): void;
    /**
     * React to the gamepad being disconnected.
     */
    "onGamepadDisconnect"(event: any): void;
    /**
     * Starts a polling loop to check for gamepad state.
     */
    "startPolling"(): void;
    /**
     * Stops a polling loop by setting a flag which will prevent the next
     * requestAnimationFrame() from being scheduled.
     */
    "stopPolling"(): void;
    /**
     * A function called with each requestAnimationFrame(). Polls the gamepad
     * status and schedules another poll.
     */
    _behaviour: IgeEntityBehaviourMethod;
    /**
     * Checks for the gamepad status. Monitors the necessary data and notices
     * the differences from previous state (buttons for Chrome/Firefox,
     * new connects/disconnects for Chrome). If differences are noticed, asks
     * to update the display accordingly. Should run as close to 60 frames per
     * second as possible.
     */
    "pollStatus"(): void;
    "pollGamepads"(): void;
}
export default IgeGamePadComponent;
