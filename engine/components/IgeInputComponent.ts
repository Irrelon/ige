import {ige} from "../instance";
import IgePoint3d from "../core/IgePoint3d";
import IgeViewport from "../core/IgeViewport";
import { IgeInputEventControl } from "../../types/IgeInputEventControl";
import IgeComponent from "../core/IgeComponent";
import type { IgeEngine } from "../core/IgeEngine";

export interface IgeInputMouseInterface {
	"dblClick": number;
	"down": number;
	"up": number;
	"move": number;
	"wheel": number;
	"wheelUp": number;
	"wheelDown": number;
	"x": number;
	"y": number;
	"button1": number;
	"button2": number;
	"button3": number;
}

export interface IgeInputGamePadInterface {
	"button1": number;
	"button2": number;
	"button3": number;
	"button4": number;
	"button5": number;
	"button6": number;
	"button7": number;
	"button8": number;
	"button9": number;
	"button10": number;
	"button11": number;
	"button12": number;
	"button13": number;
	"button14": number;
	"button15": number;
	"button16": number;
	"button17": number;
	"button18": number;
	"button19": number;
	"button20": number;
	"stick1": number;
	"stick2": number;
	"stick1Up": number;
	"stick1Down": number;
	"stick1Left": number;
	"stick1Right": number;
	"stick2Up": number;
	"stick2Down": number;
	"stick2Left": number;
	"stick2Right": number;
}

export interface IgeInputKeyboardInterface {
	"shift": number;
	"ctrl": number;
	"alt": number;
	"backspace": number;
	"tab": number;
	"enter": number;
	"escape": number;
	"space": number;
	"pageUp": number;
	"pageDown": number;
	"end": number;
	"home": number;
	"left": number;
	"up": number;
	"right": number;
	"down": number;
	"insert": number;
	"del": number;
	"0": number;
	"1": number;
	"2": number;
	"3": number;
	"4": number;
	"5": number;
	"6": number;
	"7": number;
	"8": number;
	"9": number;
	"a": number;
	"b": number;
	"c": number;
	"d": number;
	"e": number;
	"f": number;
	"g": number;
	"h": number;
	"i": number;
	"j": number;
	"k": number;
	"l": number;
	"m": number;
	"n": number;
	"o": number;
	"p": number;
	"q": number;
	"r": number;
	"s": number;
	"t": number;
	"u": number;
	"v": number;
	"w": number;
	"x": number;
	"y": number;
	"z": number;
}

class IgeInputComponent extends IgeComponent<IgeEngine> {
	classId = "IgeInputComponent";
	componentId = "input";
	_eventQueue: [((evc: IgeInputEventControl, eventData?: any) => void), any][];
	_eventControl: IgeInputEventControl;
	_evRef: Record<string, (event: any) => void> = {};
	_debug?: boolean;
	_state: Record<string | number, boolean | number>;
	_controlMap: Record<string, string | number>;
	mouse: IgeInputMouseInterface;
	pad1: IgeInputGamePadInterface;
	pad2: IgeInputGamePadInterface;
	key: IgeInputKeyboardInterface;
	dblClick?: Event;
	mouseMove?: Event;
	mouseDown?: Event;
	mouseUp?: Event;
	mouseWheel?: Event;
	contextMenu?: Event;

	constructor () {
		super();

		// Set up the input objects to hold the current input state
		this._eventQueue = [];
		this._eventControl = {
			"_cancelled": false,
			"stopPropagation" () {
				this._cancelled = true;
			}
		};

		this.tick();

		this.mouse = {
			// Virtual codes
			"dblClick": -302,
			"down": -301,
			"up": -300,
			"move": -259,
			"wheel": -258,
			"wheelUp": -257,
			"wheelDown": -256,
			"x": -255,
			"y": -254,
			"button1": -253,
			"button2": -252,
			"button3": -251
		};

		this.pad1 = {
			// Virtual codes
			"button1": -250,
			"button2": -249,
			"button3": -248,
			"button4": -247,
			"button5": -246,
			"button6": -245,
			"button7": -244,
			"button8": -243,
			"button9": -242,
			"button10": -241,
			"button11": -240,
			"button12": -239,
			"button13": -238,
			"button14": -237,
			"button15": -236,
			"button16": -235,
			"button17": -234,
			"button18": -233,
			"button19": -232,
			"button20": -231,
			"stick1": -230,
			"stick2": -229,
			"stick1Up": -228,
			"stick1Down": -227,
			"stick1Left": -226,
			"stick1Right": -225,
			"stick2Up": -224,
			"stick2Down": -223,
			"stick2Left": -222,
			"stick2Right": -221
		};

		this.pad2 = {
			// Virtual codes
			"button1": -220,
			"button2": -219,
			"button3": -218,
			"button4": -217,
			"button5": -216,
			"button6": -215,
			"button7": -214,
			"button8": -213,
			"button9": -212,
			"button10": -211,
			"button11": -210,
			"button12": -209,
			"button13": -208,
			"button14": -207,
			"button15": -206,
			"button16": -205,
			"button17": -204,
			"button18": -203,
			"button19": -202,
			"button20": -201,
			"stick1": -200,
			"stick2": -199,
			"stick1Up": -198,
			"stick1Down": -197,
			"stick1Left": -196,
			"stick1Right": -195,
			"stick2Up": -194,
			"stick2Down": -193,
			"stick2Left": -192,
			"stick2Right": -191
		};

		// Keycodes from http://www.asciitable.com/
		// and general console.log efforts :)
		this.key = {
			// Virtual codes
			"shift": -3,
			"ctrl": -2,
			"alt": -1,
			// Read codes
			"backspace": 8,
			"tab": 9,
			"enter": 13,
			"escape": 27,
			"space": 32,
			"pageUp": 33,
			"pageDown": 34,
			"end": 35,
			"home": 36,
			"left": 37,
			"up": 38,
			"right": 39,
			"down": 40,
			"insert": 45,
			"del": 46,
			"0": 48,
			"1": 49,
			"2": 50,
			"3": 51,
			"4": 52,
			"5": 53,
			"6": 54,
			"7": 55,
			"8": 56,
			"9": 57,
			"a": 65,
			"b": 66,
			"c": 67,
			"d": 68,
			"e": 69,
			"f": 70,
			"g": 71,
			"h": 72,
			"i": 73,
			"j": 74,
			"k": 75,
			"l": 76,
			"m": 77,
			"n": 78,
			"o": 79,
			"p": 80,
			"q": 81,
			"r": 82,
			"s": 83,
			"t": 84,
			"u": 85,
			"v": 86,
			"w": 87,
			"x": 88,
			"y": 89,
			"z": 90
		};

		this._controlMap = {};
		this._state = {};

		// Set default values for the mouse position
		this._state[this.mouse.x] = 0;
		this._state[this.mouse.y] = 0;

		// Ask the input component to set up any listeners it has
		//this.setupListeners(ige.engine._canvas);
	}

	debug = (val?: boolean) => {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	}

	/**
	 * Sets up the event listeners on the main window and front
	 * buffer DOM objects.
	 * @private
	 */
	setupListeners = (canvas?: HTMLCanvasElement) => {
		if (!canvas) {
			this.log("Cannot set up input event listeners - no canvas was supplied");
			return;
		}

		this.log("Setting up input event listeners...");

		// Define event functions and keep references for later removal
		this._evRef = {
			"mousedown": (event: MouseEvent) => {
				this._rationalise(event, "mouse");
				this._mouseDown(event);
			},
			"mouseup": (event: MouseEvent) => {
				this._rationalise(event, "mouse");
				this._mouseUp(event);
			},
			"mousemove": (event: MouseEvent) => {
				this._rationalise(event, "mouse");
				this._mouseMove(event);
			},
			"mouseWheel": (event: WheelEvent) => {
				this._rationalise(event, "mouse");
				this._mouseWheel(event);
			},

			"touchmove": (event: TouchEvent) => {
				this._rationalise(event, "touch");
				this._mouseMove(event);
			},
			"touchstart": (event: TouchEvent) => {
				this._rationalise(event, "touch");
				this._mouseDown(event);
			},
			"touchend": (event: TouchEvent) => {
				this._rationalise(event, "touch");
				this._mouseUp(event);
			},

			"contextmenu": (event: MouseEvent) => {
				event.preventDefault();
				this._rationalise(event, "mouse");
				this._contextMenu(event);
			},

			"keydown": (event: KeyboardEvent) => {
				this._rationalise(event, "key");
				this._keyDown(event);
			},
			"keyup": (event: KeyboardEvent) => {
				this._rationalise(event, "key");
				this._keyUp(event);
			}
		};

		// Listen for mouse events
		canvas.addEventListener("mousedown", this._evRef.mousedown, false);
		canvas.addEventListener("mouseup", this._evRef.mouseup, false);
		canvas.addEventListener("mousemove", this._evRef.mousemove, false);
		canvas.addEventListener("wheel", this._evRef.mouseWheel, false);

		// Touch events
		canvas.addEventListener("touchmove", this._evRef.touchmove, false);
		canvas.addEventListener("touchstart", this._evRef.touchstart, false);
		canvas.addEventListener("touchend", this._evRef.touchend, false);

		// Kill the context menu on right-click, urgh!
		canvas.addEventListener("contextmenu", this._evRef.contextmenu, false);

		// Listen for keyboard events
		window.addEventListener("keydown", this._evRef.keydown, false);
		window.addEventListener("keyup", this._evRef.keyup, false);
	}

	destroyListeners = () => {
		this.log("Removing input event listeners...");

		// Keyboard events
		window.removeEventListener("keydown", this._evRef.keydown, false);
		window.removeEventListener("keyup", this._evRef.keyup, false);

		// Get the canvas element
		const canvas = ige.engine._canvas;
		if (!canvas) return;

		// Mouse events
		canvas.removeEventListener("mousedown", this._evRef.mousedown, false);
		canvas.removeEventListener("mouseup", this._evRef.mouseup, false);
		canvas.removeEventListener("mousemove", this._evRef.mousemove, false);
		canvas.removeEventListener("wheel", this._evRef.mouseWheel, false);

		// Touch events
		canvas.removeEventListener("touchmove", this._evRef.touchmove, false);
		canvas.removeEventListener("touchstart", this._evRef.touchstart, false);
		canvas.removeEventListener("touchend", this._evRef.touchend, false);

		// Context menu events
		canvas.removeEventListener("contextmenu", this._evRef.contextmenu, false);
	}

	/**
	 * Fires an input event that didn't occur on the main canvas, as if it had
	 * occurred on the main canvas, allowing you to pass through events like
	 * mousedown and mouseup that occurred elsewhere on the DOM but might be
	 * useful for the engine to be aware of, such as if you are dragging an entity
	 * and then the mouse goes off-canvas and the button is released.
	 * @param {String} eventName The lowercase name of the event to fire e.g. mousedown.
	 * @param {Object} eventObj The event object that was passed by the DOM.
	 */
	fireManualEvent = (eventName: string, eventObj: Event) => {
		if (eventName && eventObj) {
			if (this._evRef[eventName]) {
				this._evRef[eventName](eventObj);
			} else {
				this.log("Cannot fire manual event \"" + eventName + "\" because no listener exists in the engine for this event type!", "warning");
			}
		} else {
			this.log("Cannot fire manual event because both eventName and eventObj params are required.", "warning");
		}
	}

	/**
	 * Sets igeX and igeY properties in the event object that
	 * can be relied on to provide the x, y co-ordinates of the
	 * mouse event including the canvas offset.
	 * @param {Event} event The event object.
	 * @param type
	 * @private
	 */
	_rationalise = (event: MouseEvent | KeyboardEvent | TouchEvent, type: "mouse" | "key" | "touch") => {
		event.igeType = type;

		// Check if we want to prevent default behaviour
		if (type === "key") {
			const keyboardEvent = event as KeyboardEvent;
			// TODO: Re-map all the keys using the new event.key property
			if (keyboardEvent.keyCode === 8) { // Backspace
				// Check if the event occurred on the body
				const elem: Element | null = event.target as Element;

				if ((elem?.tagName || "body").toLowerCase() === "body") {
					// The event occurred on our body element so prevent
					// default behaviour. This allows other elements on
					// the page to retain focus such as text boxes etc
					// and allows them to behave normally.
					event.preventDefault();
				}
			}
		}


		if (type === "touch") {
			const touchEvent = event as TouchEvent;
			touchEvent.preventDefault();
			touchEvent.button = 0; // Emulate left mouse button

			// Handle touch changed
			if (touchEvent.changedTouches && touchEvent.changedTouches.length) {
				touchEvent.igePageX = touchEvent.changedTouches[0].pageX;
				touchEvent.igePageY = touchEvent.changedTouches[0].pageY;
			}
		}

		if (type === "mouse") {
			// @ts-ignore
			event.igePageX = event.pageX;
			// @ts-ignore
			event.igePageY = event.pageY;
		}

		const canvasPosition = ige.engine._canvasPosition();
		event.igeX = (event.igePageX - canvasPosition.left);
		event.igeY = (event.igePageY - canvasPosition.top);

		this.emit("inputEvent", event);
	}


	/**
	 * Emits the "mouseDown" event.
	 * @param event
	 * @private
	 */
	_mouseDown = (event: MouseEvent | TouchEvent) => {
		if (this._debug) {
			console.log("Mouse Down", event);
		}

		// Update the mouse position within the viewports
		this._updateMouseData(event);

		const mx = event.igeX - ige.engine._bounds2d.x2;
		const my = event.igeY - ige.engine._bounds2d.y2;

		if (event.button === 0) {
			this._state[this.mouse.button1] = true;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = true;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = true;
		}

		this.mouseDown = event;

		if (!this.emit("preMouseDown", [event, mx, my, event.button + 1])) {
			this.queueEvent(() => {
				this.emit("mouseDown", [event, mx, my, event.button + 1]);
			});
		}
	}

	/**
	 * Emits the "mouseUp" event.
	 * @param event
	 * @private
	 */
	_mouseUp = (event: MouseEvent | TouchEvent) => {
		if (this._debug) {
			console.log("Mouse Up", event);
		}

		// Update the mouse position within the viewports
		this._updateMouseData(event);

		const mx = event.igeX - ige.engine._bounds2d.x2;
		const my = event.igeY - ige.engine._bounds2d.y2;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.mouseUp = event;

		if (!this.emit("preMouseUp", [event, mx, my, event.button + 1])) {
			this.queueEvent(() => {
				this.emit("mouseUp", [event, mx, my, event.button + 1]);
			});
		}
	}

	_contextMenu = (event: MouseEvent) => {
		if (this._debug) {
			console.log("Context Menu", event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		const mx = event.igeX - ige.engine._bounds2d.x2;
		const my = event.igeY - ige.engine._bounds2d.y2;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.contextMenu = event;

		if (!this.emit("preContextMenu", [event, mx, my, event.button + 1])) {
			this.queueEvent(() => {
				this.emit("contextMenu", [event, mx, my, event.button + 1]);
			});
		}
	}

	/**
	 * Emits the "mouseMove" event.
	 * @param event
	 * @private
	 */
	_mouseMove = (event: MouseEvent | TouchEvent) => {
		// Update the mouse position within the viewports
		ige._mouseOverVp = this._updateMouseData(event);

		const mx = event.igeX - ige.engine._bounds2d.x2;
		const my = event.igeY - ige.engine._bounds2d.y2;

		this._state[this.mouse.x] = mx;
		this._state[this.mouse.y] = my;

		this.mouseMove = event;

		if (!this.emit("preMouseMove", [event, mx, my, event.button + 1])) {
			this.queueEvent(() => {
				this.emit("mouseMove", [event, mx, my, event.button + 1]);
			});
		}
	}

	/**
	 * Emits the "mouseWheel" event.
	 * @param event
	 * @private
	 */
	_mouseWheel = (event: WheelEvent) => {
		if (this._debug) {
			console.log("MouseWheel", event);
		}

		// Update the mouse position within the viewports
		this._updateMouseData(event);

		const mx = event.igeX - ige.engine._bounds2d.x2;
		const my = event.igeY - ige.engine._bounds2d.y2;

		this._state[this.mouse.wheel] = event.deltaY;

		if (event.deltaY > 0) {
			this._state[this.mouse.wheelUp] = true;
		} else {
			this._state[this.mouse.wheelDown] = true;
		}

		this.mouseWheel = event;

		if (!this.emit("preMouseWheel", [event, mx, my, event.button + 1])) {
			this.queueEvent(() => {
				this.emit("mouseWheel", [event, mx, my, event.button + 1]);
			});
		}
	}

	/**
	 * Emits the "keyDown" event.
	 * @param event
	 * @private
	 */
	_keyDown = (event: KeyboardEvent) => {
		this._state[event.keyCode] = true;

		if (this._debug) {
			console.log("Key Down", event);
		}

		if (!this.emit("preKeyDown", [event, event.keyCode])) {
			this.queueEvent(() => {
				this.emit("keyDown", [event, event.keyCode]);
			});
		}
	}

	/**
	 * Emits the "keyUp" event.
	 * @param event
	 * @private
	 */
	_keyUp = (event: KeyboardEvent) => {
		this._state[event.keyCode] = false;

		if (this._debug) {
			console.log("Key Up", event);
		}

		if (!this.emit("preKeyUp", [event, event.keyCode])) {
			this.queueEvent(() => {
				this.emit("keyUp", [event, event.keyCode]);
			});
		}
	}

	/**
	 * Loops the mounted viewports and updates their respective mouse
	 * co-ordinates so that mouse events can work out where on a viewport
	 * they occurred.
	 *
	 * @param {Event} event The HTML DOM event that occurred.
	 * @return {*}
	 * @private
	 */
	_updateMouseData = (event: MouseEvent | TouchEvent): IgeViewport | undefined => {
		// Loop the viewports and check if the mouse is inside
		const arr = ige.engine._children as unknown as IgeViewport[];
		const mx = (event.igeX - ige.engine._bounds2d.x2) - ige.engine._translate.x;
		const my = (event.igeY - ige.engine._bounds2d.y2) - ige.engine._translate.y;

		let arrCount = arr.length;
		let vpUpdated;

		ige._mousePos.x = mx;
		ige._mousePos.y = my;

		while (arrCount--) {
			const vp = arr[arr.length - (arrCount + 1)];

			// Check if the mouse is inside this viewport's bounds
			// TODO: Update this code to take into account viewport rotation and camera rotation
			if (mx > vp._translate.x - vp._bounds2d.x / 2 && mx < vp._translate.x + vp._bounds2d.x / 2) {
				if (my > vp._translate.y - vp._bounds2d.y / 2 && my < vp._translate.y + vp._bounds2d.y / 2) {
					// Mouse is inside this viewport
					vp._mousePos = new IgePoint3d(
						Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
						Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
						0
					);

					vpUpdated = vp;

					// Record the viewport that this event occurred on in the
					// event object
					event.igeViewport = vp;
					break;
				}
			}
		}

		return vpUpdated as IgeViewport;
	}

	/**
	 * Defines an action that will be emitted when the specified event type
	 * occurs.
	 * @param actionName
	 * @param eventCode
	 */
	mapAction = (actionName: string, eventCode: string | number) => {
		this._controlMap[actionName] = eventCode;
	}

	/**
	 * Returns the passed action's input state value.
	 * @param actionName
	 */
	actionVal = (actionName: string) => {
		return this._state[this._controlMap[actionName]];
	}

	/**
	 * Returns true if the passed action's input is pressed or its state
	 * is not zero.
	 * @param actionName
	 */
	actionState = (actionName: string) => {
		return Boolean(this._state[this._controlMap[actionName]]);
	}

	/**
	 * Returns an input's current value.
	 * @param inputId
	 * @return {*}
	 */
	val = (inputId: string | number) => {
		return this._state[inputId];
	}

	/**
	 * Returns an input's current state as a boolean.
	 * @param inputId
	 * @return {Boolean}
	 */
	state = (inputId: string | number): boolean => {
		return Boolean(this._state[inputId]);
	}

	/**
	 * Stops further event propagation for this tick.
	 * @return {*}
	 */
	stopPropagation = () => {
		this._eventControl._cancelled = true;
		return this;
	}

	/**
	 * Adds an event method to the eventQueue array. The array is
	 * processed during each tick after the scenegraph has been
	 * rendered.
	 * @param {Function} eventFunction The event function.
	 * @param {*} [eventData] The event data.
	 */
	queueEvent = (eventFunction?: ((evc: IgeInputEventControl, eventData?: any) => boolean | void), eventData?: any) => {
		if (eventFunction !== undefined) {
			this._eventQueue.push([eventFunction, eventData]);
		}

		return this;
	}

	/**
	 * Called by the engine after ALL other tick methods have processed.
	 * Call originates in IgeRoot.js. Allows us to reset any flags etc.
	 */
	tick () {
		// If we have an event queue, process it
		const arr = this._eventQueue;
		const evc = this._eventControl;

		let arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount][0](evc, arr[arrCount][1]);

			if (evc._cancelled) {
				// The last event queue method stopped propagation so cancel all further
				// event processing (the last event took control of the input)
				break;
			}
		}

		// Reset all the flags and variables for the next tick
		this._eventQueue = [];
		this._eventControl._cancelled = false;
		delete this.dblClick; // TODO: Add double-click event handling
		delete this.mouseMove;
		delete this.mouseDown;
		delete this.mouseUp;
		delete this.mouseWheel;
	}

	/**
	 * Emit an event by name. Overrides the IgeEventingClass emit method and
	 * checks for propagation stopped by calling ige.engine.components.input.stopPropagation().
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} args The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit (eventName: string, args?: any): number {
		if (!this._eventListeners) {
			return 0;
		}

		// Check if the event has any listeners
		if (!this._eventListeners[eventName]) {
			return 0;
		}

		const evc = this._eventControl;
		let eventCount = this._eventListeners[eventName].length;
		const eventCount2 = this._eventListeners[eventName].length - 1;

		let finalArgs: any[] = [];

		if (!eventCount) {
			return 0;
		}

		finalArgs = [];

		if (typeof (args) === "object" && args !== null && args[0] !== null) {
			args.forEach((arg: any, argIndex: number) => {
				finalArgs[argIndex] = arg;
			});
		} else {
			finalArgs = [args];
		}

		let cancelFlag = false;
		this._eventsProcessing = true;

		while (eventCount--) {
			if (evc._cancelled) {
				// The stopPropagation() method was called, cancel all other event calls
				break;
			}

			const eventIndex = eventCount2 - eventCount;
			const tempEvt = this._eventListeners[eventName][eventIndex];

			// If the sendEventName flag is set, overwrite the arguments with the event name
			if (tempEvt.sendEventName) {
				finalArgs = [eventName];
			}

			// Call the callback
			const retVal = tempEvt.callback.apply(tempEvt.context || this, finalArgs);

			// If the retVal === true then store the cancel flag and return to the emitting method
			if (retVal === true || evc._cancelled) {
				// The receiver method asked us to send a cancel request back to the emitter
				cancelFlag = true;
			}

			// Check if we should now cancel the event
			if (tempEvt.oneShot) {
				// The event has a oneShot flag so since we have fired the event,
				// lets cancel the listener now
				this.off(eventName, tempEvt);
			}
		}

		this._eventsProcessing = false;
		this._processRemovals();

		if (cancelFlag) {
			return 1;
		}

		return 0;
	}
}

export default IgeInputComponent;
