import { IgeComponent } from "../core/IgeComponent.js"
import { IgePoint2d } from "../core/IgePoint2d.js";
import { IgePoint3d } from "../core/IgePoint3d.js"
import type { IgeRect } from "../core/IgeRect.js";
/**
 * When added to a viewport, automatically adds mouse zooming
 * capabilities to the viewport's camera.
 */
export declare class IgeMouseZoomComponent extends IgeComponent {
    static componentTargetClass: string;
    classId: string;
    componentId: string;
    _enabled: boolean;
    _limit?: IgeRect;
    _zoomStartMouse?: IgePoint3d;
    _zoomStartCamera?: IgePoint2d;
    /**
     * Sets / gets the enabled flag. If set to true, zoom
     * operations will be processed. If false, no zooming will
     * occur.
     * @param {boolean=} val
     * @return {*}
     */
    enabled(val?: boolean): any;
    /**
     * Handles the pointerDown event. Records the starting position of the
     * camera zoom and the current camera translation.
     * @param event
     * @private
     */
    _pointerDown: (event: Event) => void;
    /**
     * Handles the mouse wheel event. Scales the camera as the wheel goes
     * positive or negative delta.
     * @param event
     * @private
     */
    _pointerWheel: (event: WheelEvent) => void;
    /**
     * Handles the mouse up event. Finishes the camera scale and
     * removes the starting zoom data.
     * @param event
     * @private
     */
    _pointerUp: (event: Event) => void;
}
