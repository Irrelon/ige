import { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import { isClient } from "@/engine/utils/clientServer";
import { IgeBehaviourType } from "@/enums";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";

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
export enum IgeGamePadButton {
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
export enum IgeGamePadAxis {
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
export class IgeGamePadComponent extends IgeComponent<IgeEngine> {
	static componentTargetClass = "IgeEngine";
	classId = "IgeGamePadComponent";
	componentId = "gamePad";

	/** True if the browser supports the Gamepad API. */
	gamepadApiAvailable: boolean | null = null;

	/** Deadzone applied to analogue stick axes (magnitude below this reads 0). */
	deadzone = 0.18;

	TYPICAL_BUTTON_COUNT = 16;
	TYPICAL_AXIS_COUNT = 4;

	/**
	 * Normalized per-frame state, indexed by gamepad index. Always safe to read
	 * even when no pad is connected at that index (returns a disconnected state).
	 */
	states: IgeGamePadState[] = [];

	/** Kept for backward compatibility with prior versions of this component. */
	gamepads: Gamepad[] = [];

	constructor (entity: IgeEngine, options?: any) {
		super(entity, options);

		if (!isClient || typeof (navigator as Navigator).getGamepads === "undefined") {
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
	onGamepadConnect = (event: GamepadEvent) => {
		this.gamepads.push(event.gamepad);
		this.emit("change");
		this.emit("connected", event.gamepad);
	};

	/**
	 * React to a gamepad being disconnected.
	 */
	onGamepadDisconnect = (event: GamepadEvent) => {
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
	get connectedCount (): number {
		return this.states.filter((s) => s && s.connected).length;
	}

	/**
	 * Get the normalized state for a pad index. Always returns a valid object.
	 */
	pad (padIndex: number): IgeGamePadState {
		const state = this.states[padIndex];
		if (state) return state;
		return this._emptyState(padIndex);
	}

	isConnected (padIndex: number): boolean {
		return Boolean(this.states[padIndex] && this.states[padIndex].connected);
	}

	/**
	 * Deadzone-applied analogue axis value (-1..1).
	 */
	axis (padIndex: number, axisIndex: number): number {
		const state = this.states[padIndex];
		if (!state || !state.connected) return 0;
		return state.axes[axisIndex] ?? 0;
	}

	/**
	 * Analogue button value 0..1 (1 for digital buttons when pressed).
	 */
	buttonValue (padIndex: number, buttonIndex: number): number {
		const state = this.states[padIndex];
		if (!state || !state.connected) return 0;
		return state.buttons[buttonIndex]?.value ?? 0;
	}

	/**
	 * True while the button is held down.
	 */
	button (padIndex: number, buttonIndex: number): boolean {
		const state = this.states[padIndex];
		if (!state || !state.connected) return false;
		return state.buttons[buttonIndex]?.pressed ?? false;
	}

	/**
	 * True only on the frame the button was first pressed (edge trigger).
	 */
	justPressed (padIndex: number, buttonIndex: number): boolean {
		const state = this.states[padIndex];
		if (!state || !state.connected) return false;
		return state.buttons[buttonIndex]?.justPressed ?? false;
	}

	_emptyState (padIndex: number): IgeGamePadState {
		return {
			connected: false,
			id: "",
			index: padIndex,
			axes: [],
			buttons: []
		};
	}

	_applyDeadzone (value: number): number {
		if (Math.abs(value) < this.deadzone) return 0;
		// Rescale so the usable range starts just past the deadzone, avoiding a
		// jump from 0 straight to deadzone magnitude.
		const sign = value < 0 ? -1 : 1;
		return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone));
	}

	/**
	 * Per-frame poll. The Gamepad API requires re-reading getGamepads() each frame
	 * (snapshots are not live in Chrome), so we rebuild the normalized state here.
	 */
	_behaviour: IgeEntityBehaviourMethod = () => {
		if (!this.gamepadApiAvailable) return;

		const raw = (navigator as Navigator).getGamepads();
		if (!raw) return;

		for (let p = 0; p < raw.length; p++) {
			const gp = raw[p];

			if (!gp) {
				if (this.states[p]) this.states[p].connected = false;
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
