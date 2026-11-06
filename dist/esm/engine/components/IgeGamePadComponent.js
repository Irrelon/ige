import { IgeComponent } from "../core/IgeComponent.js"
import { isClient } from "../utils/clientServer.js"
import { IgeBehaviourType } from "../../enums/index.js"
/**
 * Standard (W3C "standard" mapping) button indexes for convenience.
 */
export var IgeGamePadButton;
(function (IgeGamePadButton) {
    IgeGamePadButton[IgeGamePadButton["a"] = 0] = "a";
    IgeGamePadButton[IgeGamePadButton["b"] = 1] = "b";
    IgeGamePadButton[IgeGamePadButton["x"] = 2] = "x";
    IgeGamePadButton[IgeGamePadButton["y"] = 3] = "y";
    IgeGamePadButton[IgeGamePadButton["leftBumper"] = 4] = "leftBumper";
    IgeGamePadButton[IgeGamePadButton["rightBumper"] = 5] = "rightBumper";
    IgeGamePadButton[IgeGamePadButton["leftTrigger"] = 6] = "leftTrigger";
    IgeGamePadButton[IgeGamePadButton["rightTrigger"] = 7] = "rightTrigger";
    IgeGamePadButton[IgeGamePadButton["back"] = 8] = "back";
    IgeGamePadButton[IgeGamePadButton["start"] = 9] = "start";
    IgeGamePadButton[IgeGamePadButton["leftStick"] = 10] = "leftStick";
    IgeGamePadButton[IgeGamePadButton["rightStick"] = 11] = "rightStick";
    IgeGamePadButton[IgeGamePadButton["dpadUp"] = 12] = "dpadUp";
    IgeGamePadButton[IgeGamePadButton["dpadDown"] = 13] = "dpadDown";
    IgeGamePadButton[IgeGamePadButton["dpadLeft"] = 14] = "dpadLeft";
    IgeGamePadButton[IgeGamePadButton["dpadRight"] = 15] = "dpadRight";
})(IgeGamePadButton || (IgeGamePadButton = {}));
/**
 * Standard analogue axis indexes.
 */
export var IgeGamePadAxis;
(function (IgeGamePadAxis) {
    IgeGamePadAxis[IgeGamePadAxis["leftX"] = 0] = "leftX";
    IgeGamePadAxis[IgeGamePadAxis["leftY"] = 1] = "leftY";
    IgeGamePadAxis[IgeGamePadAxis["rightX"] = 2] = "rightX";
    IgeGamePadAxis[IgeGamePadAxis["rightY"] = 3] = "rightY";
})(IgeGamePadAxis || (IgeGamePadAxis = {}));
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
export class IgeGamePadComponent extends IgeComponent {
    static componentTargetClass = "IgeEngine";
    classId = "IgeGamePadComponent";
    componentId = "gamePad";
    /** True if the browser supports the Gamepad API. */
    gamepadApiAvailable = null;
    /** Deadzone applied to analogue stick axes (magnitude below this reads 0). */
    deadzone = 0.18;
    TYPICAL_BUTTON_COUNT = 16;
    TYPICAL_AXIS_COUNT = 4;
    /**
     * Normalized per-frame state, indexed by gamepad index. Always safe to read
     * even when no pad is connected at that index (returns a disconnected state).
     */
    states = [];
    /** Kept for backward compatibility with prior versions of this component. */
    gamepads = [];
    constructor(entity, options) {
        super(entity, options);
        if (!isClient || typeof navigator.getGamepads === "undefined") {
            this.gamepadApiAvailable = false;
            return;
        }
        this.gamepadApiAvailable = true;
        window.addEventListener("gamepadconnected", this.onGamepadConnect);
        window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect);
        entity.addBehaviour(IgeBehaviourType.preUpdate, "gamePadComponent", this._behaviour);
    }
    /**
     * React to a gamepad being connected.
     * Arrow function so `this` is bound when used as an event listener.
     */
    onGamepadConnect = (event) => {
        this.gamepads.push(event.gamepad);
        this.emit("change");
        this.emit("connected", event.gamepad);
    };
    /**
     * React to a gamepad being disconnected.
     */
    onGamepadDisconnect = (event) => {
        for (const i of this.gamepads.keys()) {
            if (this.gamepads[i].index === event.gamepad.index) {
                this.gamepads.splice(i, 1);
                break;
            }
        }
        const state = this.states[event.gamepad.index];
        if (state) {
            state.connected = false;
        }
        this.emit("change");
        this.emit("disconnected", event.gamepad);
    };
    /**
     * Number of currently-connected gamepads.
     */
    get connectedCount() {
        return this.states.filter((s) => s && s.connected).length;
    }
    /**
     * Get the normalized state for a pad index. Always returns a valid object.
     */
    pad(padIndex) {
        const state = this.states[padIndex];
        if (state)
            return state;
        return this._emptyState(padIndex);
    }
    isConnected(padIndex) {
        return Boolean(this.states[padIndex] && this.states[padIndex].connected);
    }
    /**
     * Deadzone-applied analogue axis value (-1..1).
     */
    axis(padIndex, axisIndex) {
        const state = this.states[padIndex];
        if (!state || !state.connected)
            return 0;
        return state.axes[axisIndex] ?? 0;
    }
    /**
     * Analogue button value 0..1 (1 for digital buttons when pressed).
     */
    buttonValue(padIndex, buttonIndex) {
        const state = this.states[padIndex];
        if (!state || !state.connected)
            return 0;
        return state.buttons[buttonIndex]?.value ?? 0;
    }
    /**
     * True while the button is held down.
     */
    button(padIndex, buttonIndex) {
        const state = this.states[padIndex];
        if (!state || !state.connected)
            return false;
        return state.buttons[buttonIndex]?.pressed ?? false;
    }
    /**
     * True only on the frame the button was first pressed (edge trigger).
     */
    justPressed(padIndex, buttonIndex) {
        const state = this.states[padIndex];
        if (!state || !state.connected)
            return false;
        return state.buttons[buttonIndex]?.justPressed ?? false;
    }
    _emptyState(padIndex) {
        return {
            connected: false,
            id: "",
            index: padIndex,
            axes: [],
            buttons: []
        };
    }
    _applyDeadzone(value) {
        if (Math.abs(value) < this.deadzone)
            return 0;
        // Rescale so the usable range starts just past the deadzone, avoiding a
        // jump from 0 straight to deadzone magnitude.
        const sign = value < 0 ? -1 : 1;
        return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone));
    }
    /**
     * Per-frame poll. The Gamepad API requires re-reading getGamepads() each frame
     * (snapshots are not live in Chrome), so we rebuild the normalized state here.
     */
    _behaviour = () => {
        if (!this.gamepadApiAvailable)
            return;
        const raw = navigator.getGamepads();
        if (!raw)
            return;
        for (let p = 0; p < raw.length; p++) {
            const gp = raw[p];
            if (!gp) {
                if (this.states[p])
                    this.states[p].connected = false;
                continue;
            }
            let state = this.states[gp.index];
            if (!state) {
                state = this._emptyState(gp.index);
                this.states[gp.index] = state;
            }
            state.connected = true;
            state.id = gp.id;
            // Axes (deadzone applied).
            for (let a = 0; a < gp.axes.length; a++) {
                state.axes[a] = this._applyDeadzone(gp.axes[a]);
            }
            // Buttons (track justPressed edge).
            for (let b = 0; b < gp.buttons.length; b++) {
                const rawBtn = gp.buttons[b];
                const wasPressed = state.buttons[b]?.pressed ?? false;
                if (!state.buttons[b]) {
                    state.buttons[b] = { pressed: false, justPressed: false, value: 0 };
                }
                state.buttons[b].value = rawBtn.value;
                state.buttons[b].pressed = rawBtn.pressed;
                state.buttons[b].justPressed = rawBtn.pressed && !wasPressed;
            }
        }
    };
}
