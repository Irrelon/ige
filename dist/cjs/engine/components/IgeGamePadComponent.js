"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeGamePadComponent = void 0;
const IgeComponent_1 = require("../core/IgeComponent");
const clientServer_1 = require("../clientServer.js");
const IgeBehaviourType_1 = require("../../enums/IgeBehaviourType.js");
class IgeGamePadComponent extends IgeComponent_1.IgeComponent {
	constructor(entity, options) {
		super(entity, options);
		this["classId"] = "IgeGamePadComponent";
		this["componentId"] = "gamePad";
		this.gamepadAvailable = null; // True if the browser supports them
		// A number of typical buttons recognized by Gamepad API and mapped to
		// standard controls. Any extraneous buttons will have larger indexes.
		this.TYPICAL_BUTTON_COUNT = 16;
		// A number of typical axes recognized by Gamepad API and mapped to
		// standard controls. Any extraneous buttons will have larger indexes.
		this.TYPICAL_AXIS_COUNT = 4;
		// Whether we’re requestAnimationFrameing like it’s 1999.
		this.ticking = false;
		// The canonical list of attached gamepads, without “holes” (always
		// starting at [0]) and unified between Firefox and Chrome.
		this.gamepads = [];
		// Remembers the connected gamepads at the last check; used in Chrome
		// to figure out when gamepads get connected or disconnected, since no
		// events are fired.
		this.prevRawGamepadTypes = [];
		// Previous timestamps for gamepad state; used in Chrome to not bother with
		// analyzing the polled data if nothing changed (timestamp is the same
		// as last time).
		this.prevTimestamps = [];
		/**
		 * A function called with each requestAnimationFrame(). Polls the gamepad
		 * status and schedules another poll.
		 */
		this._behaviour = (entity) => {
			//entity.gamePad.pollStatus();
		};
		if (!clientServer_1.isClient) {
			return;
		}
		this.gamepadAvailable = Boolean(navigator.getGamepads());
		if (!this.gamepadAvailable) {
			// It doesn't seem Gamepad API is available
			this.emit("notSupported");
			return;
		}
		window.addEventListener("gamepadconnected", this.onGamepadConnect);
		window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect);
		entity.addBehaviour(IgeBehaviourType_1.IgeBehaviourType.preUpdate, "gamePadComponent", this._behaviour);
	}
	onGamepadConnect(event) {
		// Add the new gamepad on the list of gamepads to look after.
		this.gamepads.push(event.gamepad);
		// Start the polling loop to monitor button changes.
		//this.startPolling();
		// Ask the tester to update the screen to show more gamepads.
		this.emit("change");
	}
	/**
	 * React to the gamepad being disconnected.
	 */
	onGamepadDisconnect(event) {
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
}
exports.IgeGamePadComponent = IgeGamePadComponent;
