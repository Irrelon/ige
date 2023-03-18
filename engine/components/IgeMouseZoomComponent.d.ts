import { IgeComponent } from "../core/IgeComponent";
import { IgeRect } from "../core/IgeRect";
import { IgePoint3d } from "../core/IgePoint3d";
import { IgePoint2d } from "../core/IgePoint2d";
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
     * @param {Boolean=} val
     * @return {*}
     */
    enabled(val?: boolean): any;
    /**
     * Handles the mouseDown event. Records the starting position of the
     * camera zoom and the current camera translation.
     * @param event
     * @private
     */
    _mouseDown: (event: Event) => void;
    /**
     * Handles the mouse wheel event. Scales the camera as the wheel goes
     * positive or negative delta.
     * @param event
     * @private
     */
    _mouseWheel: (event: WheelEvent) => void;
    /**
     * Handles the mouse up event. Finishes the camera scale and
     * removes the starting zoom data.
     * @param event
     * @private
     */
    _mouseUp: (event: Event) => void;
}
