import { IgeBounds } from "./IgeBounds.js"
import { IgeCamera } from "./IgeCamera.js";
import type { IgeObject } from "./IgeObject.js"
import { IgePoint3d } from "./IgePoint3d.js";
import type { IgeScene2d } from "./IgeScene2d.js"
import { IgeUiEntity } from "./IgeUiEntity.js";
import type { IgeCanRegisterById } from "../../types/IgeCanRegisterById.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
export interface IgeViewportOptions {
    width: number;
    height: number;
    scaleToWidth: number;
    scaleToHeight: number;
}
/**
 * Creates a new viewport.
 */
export declare class IgeViewport extends IgeUiEntity implements IgeCanRegisterById {
    classId: string;
    IgeViewport: boolean;
    _lockDimension?: IgePoint3d;
    _alwaysInView: boolean;
    _pointerPos: IgePoint3d;
    _clipping: boolean;
    _autoSize: boolean;
    _scene?: IgeScene2d;
    _drawGuides?: boolean;
    _drawBoundsLimitId?: string | string[];
    _drawBoundsLimitCategory?: string;
    _drawCompositeBounds?: boolean;
    _drawViewArea?: boolean;
    camera: IgeCamera;
    constructor(options?: IgeViewportOptions);
    /**
     * Sets the minimum amount of world in pixels to display in width and height.
     * When set, if the viewport's geometry is reduced below the minimum width or
     * height, the viewport's camera is automatically scaled to ensure that the
     * minimum area remains visible in the viewport.
     * @param {number} width Width in pixels.
     * @param {number} height Height in pixels.
     * @returns {*}
     */
    minimumVisibleArea(width: number, height: number): this;
    /**
     * Gets / sets the auto-size property. If set to true, the viewport will
     * automatically resize to fill the entire scene.
     * @param id
     * @return {*}
     */
    autoSize(id: boolean): this;
    autoSize(): boolean;
    /**
     * Gets / sets the scene that the viewport will render.
     * @param id
     * @return {*}
     */
    scene(id: IgeScene2d): this;
    scene(): IgeScene2d;
    /**
     * Returns the viewport's mouse position.
     * @return {IgePoint3d}
     */
    mousePos(): IgePoint3d;
    mousePosWorld(): IgePoint3d;
    /**
     * Gets the current rectangular area that the viewport is "looking at"
     * in the world. The co-ordinates are in world space.
     * @returns {IgeBounds}
     */
    viewArea(camScaleX?: number, camScaleY?: number): IgeBounds;
    /**
     * Processes the updates before the render tick is called.
     * @param tickDelta
     */
    update(tickDelta: number): void;
    /**
     * Processes the actions required each render frame.
     */
    tick(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Returns the screen position of the viewport as an IgePoint3d where x is the
     * "left" and y is the "top", useful for positioning HTML elements at the
     * screen location of an IGE entity. The returned values indicate the center
     * of the viewport on the screen.
     *
     * This method assumes that the top-left
     * of the main canvas element is at 0, 0. If not you can adjust the values
     * yourself to allow for offset.
     * @example #Get the screen position of the entity
     *     var screenPos = entity.screenPosition();
     * @return {IgePoint3d} The screen position of the entity.
     */
    screenPosition(): IgePoint3d;
    drawViewArea(): boolean;
    drawViewArea(val: boolean): this;
    drawBoundsLimitId(): string | string[] | undefined;
    drawBoundsLimitId(id: string | string[]): this;
    drawBoundsLimitCategory(): string | undefined;
    drawBoundsLimitCategory(category: string): this;
    drawCompositeBounds(): boolean | undefined;
    drawCompositeBounds(val: boolean): this;
    drawGuides(): boolean | undefined;
    drawGuides(val: boolean): this;
    paintGuides(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Draws the bounding data for each entity in the scenegraph.
     * @param ctx
     * @param rootObject
     * @param index
     */
    paintAabbs(ctx: IgeCanvasRenderingContext2d, rootObject: IgeObject, index: number): void;
    /**
     * Handles screen resize events.
     * @param event
     * @private
     */
    _resizeEvent(event?: Event): void;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {string}
     */
    _stringify(): string;
}
