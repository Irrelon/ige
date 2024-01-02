import { IgeComponent } from "../../core/IgeComponent";
import { IgeEntity } from "../../core/IgeEntity";

/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
declare class IgeEditorRotateComponent extends IgeComponent {
	classId: string;
	componentId: string;
	/**
	 * @constructor
	 * @param entity The object that the component is added to.
	 * @param options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	constructor(entity: IgeEntity, options?: any);
	/**
	 * Gets / sets the number of pixels after a mouse down that the mouse
	 * must move in order to activate the operation. Defaults to 1.
	 * @param val
	 * @return {*}
	 */
	startThreshold: (val: any) => any;
	/**
	 * Gets / sets the rectangle that the operation will be limited
	 * to using an IgeRect instance.
	 * @param {IgeRect=} rect
	 * @return {*}
	 */
	limit: (rect: any) => any;
	/**
	 * Gets / sets the enabled flag. If set to true,
	 * operations will be processed. If false, no operations will
	 * occur.
	 * @param {boolean=} val
	 * @return {*}
	 */
	enabled: (val: any) => any;
	/**
	 * Handles the pointerDown event. Records the starting position of the
	 * operation and the current operation translation.
	 * @param event
	 * @private
	 */
	_pointerDown: (event: any) => void;
	/**
	 * Handles the mouse move event. Rotates the entity as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_pointerMove: (event: any) => void;
	/**
	 * Handles the mouse up event. Finishes the entity rotate and
	 * removes the starting operation data.
	 * @param event
	 * @private
	 */
	_pointerUp: (event: any) => void;
}
export default IgeEditorRotateComponent;
