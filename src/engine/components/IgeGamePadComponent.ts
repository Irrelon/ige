import { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import { isClient } from "@/engine/utils/clientServer";
import { IgeBehaviourType } from "@/enums";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";

export class IgeGamePadComponent extends IgeComponent<IgeEngine> {
	static componentTargetClass = "IgeEngine";
	classId = "IgeGamePadComponent";
	componentId = "gamePad";

	gamepadApiAvailable: boolean | null = null; // True if the browser supports them

	// A number of typical buttons recognized by Gamepad API and mapped to
	// standard controls. Any extraneous buttons will have larger indexes.
	TYPICAL_BUTTON_COUNT = 16;

	// A number of typical axes recognized by Gamepad API and mapped to
	// standard controls. Any extraneous buttons will have larger indexes.
	TYPICAL_AXIS_COUNT = 4;

	// Whether we’re requestAnimationFraming like it’s 1999 (with an interval)
	ticking = false;

	// The canonical list of attached gamepads, without “holes” (always
	// starting at [0]) and unified between Firefox and Chrome.
	gamepads: Gamepad[] = [];

	// Remembers the connected gamepads at the last check; used in Chrome
	// to figure out when gamepads get connected or disconnected, since no
	// events are fired.
	prevRawGamepadTypes = [];

	// Previous timestamps for gamepad state; used in Chrome to not bother with
	// analyzing the polled data if nothing changed (timestamp is the same
	// as last time).
	prevTimestamps = [];

	constructor (entity: IgeEngine, options?: any) {
		super(entity, options);

		if (!isClient || typeof (navigator as Navigator).getGamepads === "undefined") {
			this.gamepadApiAvailable = false;
			return;
		}

		this.gamepadApiAvailable = true;
		//this.gamepadApiAvailable = Boolean((navigator as Navigator).getGamepads());

		if (!this.gamepadApiAvailable) {
			// It doesn't seem Gamepad API is available
			this.emit("notSupported");
			return;
		}

		window.addEventListener("gamepadconnected", this.onGamepadConnect);
		window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect);

		entity.addBehaviour(IgeBehaviourType.preUpdate, "gamePadComponent", this._behaviour);
	}

	onGamepadConnect (event: GamepadEvent) {
		// Add the new gamepad on the list of gamepads to look after.
		this.gamepads.push(event.gamepad);

		console.log("Gamepad connected", event.gamepad);

		// Start the polling loop to monitor button changes.
		//this.startPolling();

		// Ask the tester to update the screen to show more gamepads.
		this.emit("change");
	}

	/**
	 * React to the gamepad being disconnected.
	 */
	onGamepadDisconnect (event: GamepadEvent) {
		console.log("Gamepad disconnected", event.gamepad);
		// Remove the gamepad from the list of gamepads to monitor.
		for (const i of this.gamepads.keys()) {
			if (this.gamepads[i].index == event.gamepad.index) {
				this.gamepads.splice(i, 1);
				break;
			}
		}

		// If no gamepads are left, stop the polling loop.
		if (this.gamepads.length == 0) {
			//this.stopPolling();
		}

		// Ask the tester to update the screen to remove the gamepad.
		this.emit("change");
	}

	/**
	 * A function called with each requestAnimationFrame(). Polls the gamepad
	 * status and schedules another poll.
	 */
	_behaviour: IgeEntityBehaviourMethod = (entity) => {
		//entity.gamePad.pollStatus();
	};
}
