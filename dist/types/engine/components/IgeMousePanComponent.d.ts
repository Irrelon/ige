import { IgeComponent } from "../core/IgeComponent";
import { IgePoint2d } from "../core/IgePoint2d";
import { IgePoint3d } from "../core/IgePoint3d";
import { IgeRect } from "../core/IgeRect";

/**
 * When added to a viewport, automatically adds mouse panning
 * capabilities to the viewport's camera.
 */
export declare class IgeMousePanComponent extends IgeComponent {
	static componentTargetClass: string;
	classId: string;
	componentId: string;
	_enabled: boolean;
	_startThreshold: number;
	_limit?: IgeRect;
	_panPreStart: boolean;
	_panStarted: boolean;
	_panStartMouse?: IgePoint3d;
	_panStartCamera?: IgePoint2d;
	/**
	 * Gets / sets the number of pixels after a mouse down that the mouse
	 * must move in order to activate a pan operation. Defaults to 5.
	 * @param val
	 * @return {*}
	 */
	startThreshold: (val?: number) => any;
	/**
	 * Gets / sets the rectangle that the pan operation will be limited
	 * to using an IgeRect instance.
	 * @param {IgeRect=} rect
	 * @return {*}
	 */
	limit(rect?: IgeRect): any;
	/**
	 * Gets / sets the enabled flag. If set to true, pan
	 * operations will be processed. If false, no panning will
	 * occur.
	 * @param {boolean=} val
	 * @return {*}
	 */
	enabled(val?: boolean): any;
	/**
	 * Handles the pointerDown event. Records the starting position of the
	 * camera pan and the current camera translation.
	 * @param event
	 * @private
	 */
	_pointerDown: (event: Event) => void;
	/**
	 * Handles the mouse move event. Translates the camera as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_pointerMove: (event: Event) => void;
	/**
	 * Handles the mouse up event. Finishes the camera translate and
	 * removes the starting pan data.
	 * @param event
	 * @private
	 */
	_pointerUp: (event: Event) => void;
}
