import { IgeViewport } from "../core/IgeViewport";
import { IgeInputEventControl } from "@/types/IgeInputEventControl";
import { IgeInputDevice } from "@/enums/IgeInputDeviceMap";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeIsReadyPromise } from "@/types/IgeIsReadyPromise";
import { IgeInputControlMap } from "@/engine/components/IgeInputControlMap";
import { IgeEventReturnFlag } from "@/enums/IgeEventReturnFlag";
export declare class IgeInputComponent extends IgeEventingClass implements IgeIsReadyPromise {
    classId: string;
    componentId: string;
    _eventQueue: [((evc: IgeInputEventControl, eventData?: any) => void), any][];
    _eventControl: IgeInputEventControl;
    _evRef: Record<string, (event: any) => void>;
    _debug?: boolean;
    _state: Record<number, Record<number, string | number | boolean>>;
    _previousState: Record<number, Record<number, string | number | boolean>>;
    _controlMap: Record<number, IgeInputControlMap>;
    dblClick?: Event;
    pointerMove?: Event;
    pointerDown?: Event;
    pointerUp?: Event;
    pointerWheel?: Event;
    contextMenu?: Event;
    constructor();
    isReady(): Promise<void>;
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
     * pointerdown and pointerup that occurred elsewhere on the DOM but might be
     * useful for the engine to be aware of, such as if you are dragging an entity
     * and then the pointer goes off-canvas and the button is released.
     * @param {String} eventName The lowercase name of the event to fire e.g. pointerdown.
     * @param {Object} eventObj The event object that was passed by the DOM.
     */
    fireManualEvent: (eventName: string, eventObj: Event) => void;
    _ensureState(device: IgeInputDevice): void;
    _updateState(device: IgeInputDevice, inputId: number, newValue: any): void;
    /**
     * Sets igeX and igeY properties in the event object that
     * can be relied on to provide the x, y co-ordinates of the
     * pointer event including the canvas offset.
     * @param {Event} event The event object.
     * @param type
     * @private
     */
    _rationalise(event: PointerEvent, type: "pointer"): void;
    _rationalise(event: KeyboardEvent, type: "keyboard"): void;
    _rationalise(event: TouchEvent, type: "touch"): void;
    _rationalise(event: WheelEvent, type: "wheel"): void;
    _rationalise(event: GamepadEvent, type: "gamepad"): void;
    /**
     * Emits the "pointerDown" event.
     * @param event
     * @private
     */
    _pointerDown: (event: PointerEvent | TouchEvent) => void;
    /**
     * Emits the "pointerUp" event.
     * @param event
     * @private
     */
    _pointerUp: (event: PointerEvent | TouchEvent) => void;
    _contextMenu: (event: PointerEvent) => void;
    /**
     * Emits the "pointerMove" event.
     * @param event
     * @private
     */
    _pointerMove: (event: PointerEvent | TouchEvent) => void;
    /**
     * Emits the "pointerWheel" event.
     * @param event
     * @private
     */
    _pointerWheel: (event: WheelEvent) => void;
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
     * Loops the mounted viewports and updates their respective pointer
     * co-ordinates so that pointer events can work out where on a viewport
     * they occurred.
     *
     * @param {Event} event The HTML DOM event that occurred.
     * @return {*}
     * @private
     */
    _updatePointerData: (event: PointerEvent | TouchEvent | WheelEvent) => IgeViewport | undefined;
    /**
     * Defines an action that will be emitted when the specified event type
     * occurs.
     * @param actionCode
     * @param inputMap
     */
    mapAction(actionCode: number, inputMap: [IgeInputDevice, number][]): void;
    /**
     * Returns the passed action's input state value.
     * @param actionCode
     */
    actionVal(actionCode: number): string | number | boolean | undefined;
    /**
     * Returns true if the passed action's input is pressed or its state
     * is not zero.
     * @param actionCode
     */
    actionState(actionCode: number): boolean | undefined;
    /**
     * Returns an input's current value.
     * @param device
     * @param inputId
     * @return {*}
     */
    val(device: IgeInputDevice, inputId: number): string | number | boolean;
    /**
     * Returns an input's previous value.
     * @param device
     * @param inputId
     * @return {*}
     */
    previousVal(device: IgeInputDevice, inputId: number): string | number | boolean;
    /**
     * Returns an input's current state as a boolean.
     * @param device
     * @param inputId
     * @return {Boolean}
     */
    state(device: IgeInputDevice, inputId: number): boolean;
    /**
     * Returns an input's previous state as a boolean.
     * @param device
     * @param inputId
     * @return {Boolean}
     */
    previousState(device: IgeInputDevice, inputId: number): boolean;
    /**
     * Stops further event propagation for this tick.
     * @return {*}
     */
    stopPropagation(): this;
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
     * Call originates in IgeEngine.engineStep(). Allows us to reset any flags
     * etc.
     */
    tick(): void;
    /**
     * Emit an event by name. Overrides the IgeEventingClass emit method and
     * checks for propagation stopped by calling ige.input.stopPropagation().
     * @param {Object} eventName The name of the event to emit.
     * @param data
     * If you are sending multiple arguments, use an array containing each argument.
     * @return {Number}
     */
    emit(eventName: string, ...data: any[]): IgeEventReturnFlag;
}
