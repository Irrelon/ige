import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEngine } from "../core/IgeEngine.js"
import type { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour.js"
/**
 * A single normalized button reading.
 */
export interface IgeGamePadButtonState {
    /** True when the button is considered pressed. */
    pressed: boolean;
    /** True only on the frame the button transitioned from up to down. */
    justPressed: boolean;
    /** Analogue value 0..1 (1 for digital buttons when pressed). */
    value: number;
}
/**
 * A normalized snapshot of one gamepad's state for the current frame.
 */
export interface IgeGamePadState {
    connected: boolean;
    id: string;
    index: number;
    /** Analogue axes, deadzone-applied. Standard layout: [LX, LY, RX, RY]. */
    axes: number[];
    buttons: IgeGamePadButtonState[];
}
/**
 * Standard (W3C "standard" mapping) button indexes for convenience.
 */
export declare enum IgeGamePadButton {
    a = 0,
    b = 1,
    x = 2,
    y = 3,
    leftBumper = 4,
    rightBumper = 5,
    leftTrigger = 6,
    rightTrigger = 7,
    back = 8,
    start = 9,
    leftStick = 10,
    rightStick = 11,
    dpadUp = 12,
    dpadDown = 13,
    dpadLeft = 14,
    dpadRight = 15
}
/**
 * Standard analogue axis indexes.
 */
export declare enum IgeGamePadAxis {
    leftX = 0,
    leftY = 1,
    rightX = 2,
    rightY = 3
}
/**
 * Polls the browser Gamepad API every engine tick and exposes a normalized,
 * deadzone-applied snapshot of every connected controller. Designed for local
 * multiplayer (e.g. 4-player split screen) where each player maps to a pad index.
 *
 * Enable on the engine:
 *
 *     ige.engine.addComponent("gamePad", IgeGamePadComponent);
 *
 * Then read per-frame state (inside a behaviour) via:
 *
 *     const gp = ige.engine.components.gamePad as IgeGamePadComponent;
 *     const steer = gp.axis(0, IgeGamePadAxis.leftX);
 *     if (gp.justPressed(0, IgeGamePadButton.a)) { ... }
 */
export declare class IgeGamePadComponent extends IgeComponent<IgeEngine> {
    static componentTargetClass: string;
    classId: string;
    componentId: string;
    /** True if the browser supports the Gamepad API. */
    gamepadApiAvailable: boolean | null;
    /** Deadzone applied to analogue stick axes (magnitude below this reads 0). */
    deadzone: number;
    TYPICAL_BUTTON_COUNT: number;
    TYPICAL_AXIS_COUNT: number;
    /**
     * Normalized per-frame state, indexed by gamepad index. Always safe to read
     * even when no pad is connected at that index (returns a disconnected state).
     */
    states: IgeGamePadState[];
    /** Kept for backward compatibility with prior versions of this component. */
    gamepads: Gamepad[];
    constructor(entity: IgeEngine, options?: any);
    /**
     * React to a gamepad being connected.
     * Arrow function so `this` is bound when used as an event listener.
     */
    onGamepadConnect: (event: GamepadEvent) => void;
    /**
     * React to a gamepad being disconnected.
     */
    onGamepadDisconnect: (event: GamepadEvent) => void;
    /**
     * Number of currently-connected gamepads.
     */
    get connectedCount(): number;
    /**
     * Get the normalized state for a pad index. Always returns a valid object.
     */
    pad(padIndex: number): IgeGamePadState;
    isConnected(padIndex: number): boolean;
    /**
     * Deadzone-applied analogue axis value (-1..1).
     */
    axis(padIndex: number, axisIndex: number): number;
    /**
     * Analogue button value 0..1 (1 for digital buttons when pressed).
     */
    buttonValue(padIndex: number, buttonIndex: number): number;
    /**
     * True while the button is held down.
     */
    button(padIndex: number, buttonIndex: number): boolean;
    /**
     * True only on the frame the button was first pressed (edge trigger).
     */
    justPressed(padIndex: number, buttonIndex: number): boolean;
    _emptyState(padIndex: number): IgeGamePadState;
    _applyDeadzone(value: number): number;
    /**
     * Per-frame poll. The Gamepad API requires re-reading getGamepads() each frame
     * (snapshots are not live in Chrome), so we rebuild the normalized state here.
     */
    _behaviour: IgeEntityBehaviourMethod;
}
