import { IgeViewport } from "../core/IgeViewport";
import { IgeInputEventControl } from "../../types/IgeInputEventControl";
import { IgeComponent } from "../core/IgeComponent";
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
export declare class IgeInputComponent extends IgeComponent<IgeEngine> {
    classId: string;
    componentId: string;
    _eventQueue: [((evc: IgeInputEventControl, eventData?: any) => void), any][];
    _eventControl: IgeInputEventControl;
    _evRef: Record<string, (event: any) => void>;
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
    constructor();
    debug: (val?: boolean) => boolean | this | undefined;
    /**
     * Sets up the event listeners on the main window and front
     * buffer DOM objects.
     * @private
     */
    setupListeners: (canvas?: HTMLCanvasElement) => void;
    destroyListeners: () => void;
    /**
     * Fires an input event that didn't occur on the main canvas, as if it had
     * occurred on the main canvas, allowing you to pass through events like
     * mousedown and mouseup that occurred elsewhere on the DOM but might be
     * useful for the engine to be aware of, such as if you are dragging an entity
     * and then the mouse goes off-canvas and the button is released.
     * @param {String} eventName The lowercase name of the event to fire e.g. mousedown.
     * @param {Object} eventObj The event object that was passed by the DOM.
     */
    fireManualEvent: (eventName: string, eventObj: Event) => void;
    /**
     * Sets igeX and igeY properties in the event object that
     * can be relied on to provide the x, y co-ordinates of the
     * mouse event including the canvas offset.
     * @param {Event} event The event object.
     * @param type
     * @private
     */
    _rationalise: (event: MouseEvent | KeyboardEvent | TouchEvent, type: "mouse" | "key" | "touch") => void;
    /**
     * Emits the "mouseDown" event.
     * @param event
     * @private
     */
    _mouseDown: (event: MouseEvent | TouchEvent) => void;
    /**
     * Emits the "mouseUp" event.
     * @param event
     * @private
     */
    _mouseUp: (event: MouseEvent | TouchEvent) => void;
    _contextMenu: (event: MouseEvent) => void;
    /**
     * Emits the "mouseMove" event.
     * @param event
     * @private
     */
    _mouseMove: (event: MouseEvent | TouchEvent) => void;
    /**
     * Emits the "mouseWheel" event.
     * @param event
     * @private
     */
    _mouseWheel: (event: WheelEvent) => void;
    /**
     * Emits the "keyDown" event.
     * @param event
     * @private
     */
    _keyDown: (event: KeyboardEvent) => void;
    /**
     * Emits the "keyUp" event.
     * @param event
     * @private
     */
    _keyUp: (event: KeyboardEvent) => void;
    /**
     * Loops the mounted viewports and updates their respective mouse
     * co-ordinates so that mouse events can work out where on a viewport
     * they occurred.
     *
     * @param {Event} event The HTML DOM event that occurred.
     * @return {*}
     * @private
     */
    _updateMouseData: (event: MouseEvent | TouchEvent) => IgeViewport | undefined;
    /**
     * Defines an action that will be emitted when the specified event type
     * occurs.
     * @param actionName
     * @param eventCode
     */
    mapAction: (actionName: string, eventCode: string | number) => void;
    /**
     * Returns the passed action's input state value.
     * @param actionName
     */
    actionVal: (actionName: string) => number | boolean;
    /**
     * Returns true if the passed action's input is pressed or its state
     * is not zero.
     * @param actionName
     */
    actionState: (actionName: string) => boolean;
    /**
     * Returns an input's current value.
     * @param inputId
     * @return {*}
     */
    val: (inputId: string | number) => number | boolean;
    /**
     * Returns an input's current state as a boolean.
     * @param inputId
     * @return {Boolean}
     */
    state: (inputId: string | number) => boolean;
    /**
     * Stops further event propagation for this tick.
     * @return {*}
     */
    stopPropagation: () => this;
    /**
     * Adds an event method to the eventQueue array. The array is
     * processed during each tick after the scenegraph has been
     * rendered.
     * @param {Function} eventFunction The event function.
     * @param {*} [eventData] The event data.
     */
    queueEvent: (eventFunction?: ((evc: IgeInputEventControl, eventData?: any) => boolean | void) | undefined, eventData?: any) => this;
    /**
     * Called by the engine after ALL other tick methods have processed.
     * Call originates in IgeRoot.js. Allows us to reset any flags etc.
     */
    tick(): void;
    /**
     * Emit an event by name. Overrides the IgeEventingClass emit method and
     * checks for propagation stopped by calling ige.engine.components.input.stopPropagation().
     * @param {Object} eventName The name of the event to emit.
     * @param {Object || Array} args The arguments to send to any listening methods.
     * If you are sending multiple arguments, use an array containing each argument.
     * @return {Number}
     */
    emit(eventName: string, args?: any): number;
}
