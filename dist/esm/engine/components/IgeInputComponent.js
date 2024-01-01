import { ige } from "../instance.js"
import { IgePoint3d } from "../core/IgePoint3d.js"
import { IgeBehaviourType } from "../../enums/IgeBehaviourType.js"
import { IgeInputDevice, IgeInputKeyboardMap, IgeInputPointerMap } from "../../enums/IgeInputDeviceMap.js"
import { IgeEventingClass } from "../core/IgeEventingClass.js"
import { IgeInputControlMap } from "./IgeInputControlMap.js";
import { IgeEventReturnFlag } from "../../enums/IgeEventReturnFlag.js"
export class IgeInputComponent extends IgeEventingClass {
    classId = "IgeInputComponent";
    componentId = "input";
    _eventQueue;
    _eventControl;
    _evRef = {};
    _debug;
    // State <DeviceCode, <InputCode, InputValue>>
    _state = {};
    _previousState = {};
    _controlMap = {};
    dblClick;
    pointerMove;
    pointerDown;
    pointerUp;
    pointerWheel;
    contextMenu;
    constructor() {
        super();
        // Set up the input objects to hold the current input state
        this._eventQueue = [];
        this._eventControl = {
            "_cancelled": false,
            "stopPropagation"() {
                this._cancelled = true;
            }
        };
        this.tick();
        this._ensureState(IgeInputDevice.pointer1);
        this._ensureState(IgeInputDevice.keyboard);
        this._ensureState(IgeInputDevice.gamePad1);
        this._ensureState(IgeInputDevice.gamePad2);
        this._ensureState(IgeInputDevice.gamePad3);
        this._ensureState(IgeInputDevice.gamePad4);
        this._ensureState(IgeInputDevice.gamePad5);
        this._ensureState(IgeInputDevice.gamePad6);
        this._ensureState(IgeInputDevice.gamePad7);
        this._ensureState(IgeInputDevice.gamePad8);
        // Set default values for the pointer position
        this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.x, 0);
        this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.y, 0);
    }
    isReady() {
        return new Promise((resolve) => {
            setTimeout(() => {
                ige.dependencies.waitFor(["engine"], () => {
                    // Register a post-tick behaviour with the engine
                    ige.engine.addBehaviour(IgeBehaviourType.postTick, "inputComponentPostTick", this.tick.bind(this));
                    resolve();
                });
            }, 1);
        });
    }
    debug = (val) => {
        if (val !== undefined) {
            this._debug = val;
            return this;
        }
        return this._debug;
    };
    /**
     * Sets up the event listeners on the main window and front
     * buffer DOM objects.
     * @private
     */
    setupListeners = (canvas) => {
        if (!canvas) {
            this.log("Cannot set up input event listeners - no canvas was supplied");
            return;
        }
        this.log("Setting up input event listeners...");
        // Define event functions and keep references for later removal
        this._evRef = {
            "pointerdown": (event) => {
                this._rationalise(event, "pointer");
                this._pointerDown(event);
            },
            "pointerup": (event) => {
                this._rationalise(event, "pointer");
                this._pointerUp(event);
            },
            "pointermove": (event) => {
                this._rationalise(event, "pointer");
                this._pointerMove(event);
            },
            "pointerWheel": (event) => {
                this._rationalise(event, "wheel");
                this._pointerWheel(event);
            },
            // "touchmove": (event: TouchEvent) => {
            // 	this._rationalise(event, "touch");
            // 	this._pointerMove(event);
            // },
            // "touchstart": (event: TouchEvent) => {
            // 	this._rationalise(event, "touch");
            // 	this._pointerDown(event);
            // },
            // "touchend": (event: TouchEvent) => {
            // 	this._rationalise(event, "touch");
            // 	this._pointerUp(event);
            // },
            "contextmenu": (event) => {
                event.preventDefault();
                this._rationalise(event, "pointer");
                this._contextMenu(event);
            },
            "keydown": (event) => {
                this._rationalise(event, "keyboard");
                this._keyDown(event);
            },
            "keyup": (event) => {
                this._rationalise(event, "keyboard");
                this._keyUp(event);
            }
        };
        // Listen for pointer events
        canvas.addEventListener("pointerdown", this._evRef.pointerdown, false);
        canvas.addEventListener("pointerup", this._evRef.pointerup, false);
        canvas.addEventListener("pointermove", this._evRef.pointermove, false);
        canvas.addEventListener("wheel", this._evRef.pointerWheel, false);
        // Touch events
        // canvas.addEventListener("touchmove", this._evRef.touchmove, false);
        // canvas.addEventListener("touchstart", this._evRef.touchstart, false);
        // canvas.addEventListener("touchend", this._evRef.touchend, false);
        // Kill the context menu on right-click, urgh!
        canvas.addEventListener("contextmenu", this._evRef.contextmenu, false);
        // Listen for keyboard events
        window.addEventListener("keydown", this._evRef.keydown, false);
        window.addEventListener("keyup", this._evRef.keyup, false);
    };
    destroyListeners = () => {
        this.log("Removing input event listeners...");
        // Keyboard events
        window.removeEventListener("keydown", this._evRef.keydown, false);
        window.removeEventListener("keyup", this._evRef.keyup, false);
        // Get the canvas element
        const canvas = ige.engine._canvas;
        if (!canvas)
            return;
        // Pointer events
        canvas.removeEventListener("pointerdown", this._evRef.pointerdown, false);
        canvas.removeEventListener("pointerup", this._evRef.pointerup, false);
        canvas.removeEventListener("pointermove", this._evRef.pointermove, false);
        canvas.removeEventListener("wheel", this._evRef.pointerWheel, false);
        // Touch events
        // canvas.removeEventListener("touchmove", this._evRef.touchmove, false);
        // canvas.removeEventListener("touchstart", this._evRef.touchstart, false);
        // canvas.removeEventListener("touchend", this._evRef.touchend, false);
        // Context menu events
        canvas.removeEventListener("contextmenu", this._evRef.contextmenu, false);
    };
    /**
     * Fires an input event that didn't occur on the main canvas, as if it had
     * occurred on the main canvas, allowing you to pass through events like
     * pointerdown and pointerup that occurred elsewhere on the DOM but might be
     * useful for the engine to be aware of, such as if you are dragging an entity
     * and then the pointer goes off-canvas and the button is released.
     * @param {string} eventName The lowercase name of the event to fire e.g. pointerdown.
     * @param {Object} eventObj The event object that was passed by the DOM.
     */
    fireManualEvent = (eventName, eventObj) => {
        if (eventName && eventObj) {
            if (this._evRef[eventName]) {
                this._evRef[eventName](eventObj);
            }
            else {
                this.log("Cannot fire manual event \"" + eventName + "\" because no listener exists in the engine for this event type!", "warning");
            }
        }
        else {
            this.log("Cannot fire manual event because both eventName and eventObj params are required.", "warning");
        }
    };
    _ensureState(device) {
        this._state[device] = this._state[device] || {};
        this._previousState[device] = this._previousState[device] || {};
    }
    _updateState(device, inputId, newValue) {
        this._previousState[device][inputId] = this._state[device][inputId];
        this._state[device][inputId] = newValue;
    }
    _rationalise(event, type) {
        event.igeType = type;
        // Check if we want to prevent default behaviour
        if (type === "keyboard") {
            const keyboardEvent = event;
            if (keyboardEvent.code === "Backspace") { // Backspace
                // Check if the event occurred on the body
                const elem = event.target;
                if ((elem?.tagName || "body").toLowerCase() === "body") {
                    // The event occurred on our body element so prevent
                    // default behaviour. This allows other elements on
                    // the page to retain focus such as text boxes etc
                    // and allows them to behave normally.
                    event.preventDefault();
                }
            }
        }
        // if (type === "touch") {
        // 	const touchEvent = event as TouchEvent;
        // 	touchEvent.preventDefault();
        // 	touchEvent.button = 0; // Emulate left pointer button
        //
        // 	// Handle touch changed
        // 	if (touchEvent.changedTouches && touchEvent.changedTouches.length) {
        // 		touchEvent.igePageX = touchEvent.changedTouches[0].pageX;
        // 		touchEvent.igePageY = touchEvent.changedTouches[0].pageY;
        // 	}
        // }
        if (type === "pointer") {
            const pointerEvent = event;
            pointerEvent.igePageX = pointerEvent.pageX;
            pointerEvent.igePageY = pointerEvent.pageY;
        }
        const canvasPosition = ige.engine._canvasPosition();
        event.igeX = (event.igePageX - canvasPosition.left);
        event.igeY = (event.igePageY - canvasPosition.top);
        this.emit("inputEvent", event);
    }
    /**
     * Emits the "pointerDown" event.
     * @param event
     * @private
     */
    _pointerDown = (event) => {
        if (this._debug) {
            console.log("Pointer Down", event);
        }
        // Update the pointer position within the viewports
        this._updatePointerData(event);
        const mx = event.igeX - ige.engine._bounds2d.x2;
        const my = event.igeY - ige.engine._bounds2d.y2;
        if (event.button === 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button0, true);
        }
        if (event.button === 1) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button1, true);
        }
        if (event.button === 2) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button2, true);
        }
        if (event.button === 3) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button3, true);
        }
        if (event.button === 4) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button4, true);
        }
        if (event.button === 5) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button5, true);
        }
        this.pointerDown = event;
        if (this.emit("prePointerDown", event, mx, my, event.button) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("pointerDown", event, mx, my, event.button);
            });
        }
    };
    /**
     * Emits the "pointerUp" event.
     * @param event
     * @private
     */
    _pointerUp = (event) => {
        if (this._debug) {
            console.log("Pointer Up", event);
        }
        // Update the pointer position within the viewports
        this._updatePointerData(event);
        const mx = event.igeX - ige.engine._bounds2d.x2;
        const my = event.igeY - ige.engine._bounds2d.y2;
        if (event.button === 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button0, false);
        }
        if (event.button === 1) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button1, false);
        }
        if (event.button === 2) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button2, false);
        }
        if (event.button === 3) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button3, false);
        }
        if (event.button === 4) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button4, false);
        }
        if (event.button === 5) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button5, false);
        }
        this.pointerUp = event;
        if (this.emit("prePointerUp", event, mx, my, event.button) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("pointerUp", event, mx, my, event.button);
            });
        }
    };
    _contextMenu = (event) => {
        if (this._debug) {
            console.log("Context Menu", event);
        }
        // Update the pointer position within the viewports
        this._updatePointerData(event);
        const mx = event.igeX - ige.engine._bounds2d.x2;
        const my = event.igeY - ige.engine._bounds2d.y2;
        if (event.button === 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button0, false);
        }
        if (event.button === 1) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button1, false);
        }
        if (event.button === 2) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button2, false);
        }
        if (event.button === 3) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button3, false);
        }
        if (event.button === 4) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button4, false);
        }
        if (event.button === 5) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.button5, false);
        }
        this.contextMenu = event;
        if (this.emit("preContextMenu", event, mx, my, event.button) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("contextMenu", event, mx, my, event.button);
            });
        }
    };
    /**
     * Emits the "pointerMove" event.
     * @param event
     * @private
     */
    _pointerMove = (event) => {
        // Update the pointer position within the viewports
        ige._pointerOverVp = this._updatePointerData(event);
        const mx = event.igeX - ige.engine._bounds2d.x2;
        const my = event.igeY - ige.engine._bounds2d.y2;
        this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.x, mx);
        this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.y, my);
        this.pointerMove = event;
        if (this.emit("prePointerMove", event, mx, my, event.button) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("pointerMove", event, mx, my, event.button);
            });
        }
    };
    /**
     * Emits the "pointerWheel" event.
     * @param event
     * @private
     */
    _pointerWheel = (event) => {
        if (this._debug) {
            console.log("PointerWheel", event);
        }
        // Update the pointer position within the viewports
        this._updatePointerData(event);
        const mx = event.igeX - ige.engine._bounds2d.x2;
        const my = event.igeY - ige.engine._bounds2d.y2;
        if (event.deltaX !== 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelX, event.deltaX);
            if (event.deltaX > 0) {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelRight, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelLeft, false);
            }
            else {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelLeft, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelRight, false);
            }
        }
        if (event.deltaY !== 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelY, event.deltaY);
            if (event.deltaY > 0) {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelUp, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelDown, false);
            }
            else {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelDown, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelUp, false);
            }
        }
        if (event.deltaZ !== 0) {
            this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelZ, event.deltaZ);
            if (event.deltaZ > 0) {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelBackward, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelForward, false);
            }
            else {
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelForward, true);
                this._updateState(IgeInputDevice.pointer1, IgeInputPointerMap.wheelBackward, false);
            }
        }
        this.pointerWheel = event;
        if (this.emit("prePointerWheel", event, mx, my, event.button) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("pointerWheel", event, mx, my, event.button);
            });
        }
    };
    /**
     * Emits the "keyDown" event.
     * @param event
     * @private
     */
    _keyDown = (event) => {
        this._updateState(IgeInputDevice.keyboard, IgeInputKeyboardMap[event.code], true);
        if (this._debug) {
            console.log("Key Down", event);
        }
        if (this.emit("preKeyDown", event, event.code) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("keyDown", event, event.code);
            });
        }
    };
    /**
     * Emits the "keyUp" event.
     * @param event
     * @private
     */
    _keyUp = (event) => {
        this._updateState(IgeInputDevice.keyboard, IgeInputKeyboardMap[event.code], false);
        if (this._debug) {
            console.log("Key Up", event);
        }
        if (this.emit("preKeyUp", event, event.code) !== IgeEventReturnFlag.cancel) {
            this.queueEvent(() => {
                this.emit("keyUp", event, event.code);
            });
        }
    };
    /**
     * Loops the mounted viewports and updates their respective pointer
     * co-ordinates so that pointer events can work out where on a viewport
     * they occurred.
     *
     * @param {Event} event The HTML DOM event that occurred.
     * @return {*}
     * @private
     */
    _updatePointerData = (event) => {
        // Loop the viewports and check if the pointer is inside
        const arr = ige.engine._children;
        const mx = (event.igeX - ige.engine._bounds2d.x2) - ige.engine._translate.x;
        const my = (event.igeY - ige.engine._bounds2d.y2) - ige.engine._translate.y;
        let arrCount = arr.length;
        let vpUpdated;
        ige._pointerPos.x = mx;
        ige._pointerPos.y = my;
        while (arrCount--) {
            const vp = arr[arr.length - (arrCount + 1)];
            // Check if the pointer is inside this viewport's bounds
            // TODO: Update this code to take into account viewport rotation and camera rotation
            if (mx > vp._translate.x - vp._bounds2d.x / 2 && mx < vp._translate.x + vp._bounds2d.x / 2) {
                if (my > vp._translate.y - vp._bounds2d.y / 2 && my < vp._translate.y + vp._bounds2d.y / 2) {
                    // Pointer is inside this viewport
                    vp._pointerPos = new IgePoint3d(Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x), Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y), 0);
                    vpUpdated = vp;
                    // Record the viewport that this event occurred on in the
                    // event object
                    event.igeViewport = vp;
                    break;
                }
            }
        }
        return vpUpdated;
    };
    /**
     * Defines an action that will be emitted when the specified event type
     * occurs.
     * @param actionCode
     * @param inputMap
     */
    mapAction(actionCode, inputMap) {
        this._controlMap[actionCode] = this._controlMap[actionCode] || new IgeInputControlMap();
        for (let i = 0; i < inputMap.length; i++) {
            this._controlMap[actionCode].push(inputMap[i]);
        }
    }
    /**
     * Returns the passed action's input state value.
     * @param actionCode
     */
    actionVal(actionCode) {
        return this._controlMap[actionCode].val();
    }
    /**
     * Returns true if the passed action's input is pressed or its state
     * is not zero.
     * @param actionCode
     */
    actionState(actionCode) {
        return this._controlMap[actionCode].state();
    }
    /**
     * Returns an input's current value.
     * @param device
     * @param inputId
     * @return {*}
     */
    val(device, inputId) {
        return this._state[device][inputId];
    }
    /**
     * Returns an input's previous value.
     * @param device
     * @param inputId
     * @return {*}
     */
    previousVal(device, inputId) {
        return this._state[device][inputId];
    }
    /**
     * Returns an input's current state as a boolean.
     * @param device
     * @param inputId
     * @return {boolean}
     */
    state(device, inputId) {
        return Boolean(this.val(device, inputId));
    }
    /**
     * Returns an input's previous state as a boolean.
     * @param device
     * @param inputId
     * @return {boolean}
     */
    previousState(device, inputId) {
        return Boolean(this.previousVal(device, inputId));
    }
    /**
     * Stops further event propagation for this tick.
     * @return {*}
     */
    stopPropagation() {
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
    queueEvent = (eventFunction, eventData) => {
        if (eventFunction !== undefined) {
            this._eventQueue.push([eventFunction, eventData]);
        }
        return this;
    };
    /**
     * Called by the engine after ALL other tick methods have processed.
     * Call originates in IgeEngine.engineStep(). Allows us to reset any flags
     * etc.
     */
    tick() {
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
        delete this.pointerMove;
        delete this.pointerDown;
        delete this.pointerUp;
        delete this.pointerWheel;
    }
    /**
     * Emit an event by name. Overrides the IgeEventingClass emit method and
     * checks for propagation stopped by calling ige.input.stopPropagation().
     * @param {Object} eventName The name of the event to emit.
     * @param data
     * If you are sending multiple arguments, use an array containing each argument.
     * @return {number}
     */
    emit(eventName, ...data) {
        if (!this._eventListeners) {
            return IgeEventReturnFlag.none;
        }
        const evc = this._eventControl;
        const id = "*";
        let returnFlag = IgeEventReturnFlag.none;
        this._eventsEmitting = true;
        if (this._eventListeners[eventName] && this._eventListeners[eventName][id]) {
            // Handle global emit
            const arr = this._eventListeners[eventName][id];
            const arrCount = arr.length;
            for (let arrIndex = 0; arrIndex < arrCount; arrIndex++) {
                if (evc._cancelled) {
                    // The stopPropagation() method was called, cancel all other event calls
                    break;
                }
                // Check we have a function to execute
                const tmpFunc = arr[arrIndex];
                if (typeof tmpFunc === "function") {
                    const result = tmpFunc(...data);
                    if (result || evc._cancelled) {
                        returnFlag = IgeEventReturnFlag.cancel;
                    }
                }
            }
        }
        this._eventsEmitting = false;
        this._processRemovalQueue();
        return returnFlag;
    }
}
