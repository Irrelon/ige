import { IgeEntity } from "./IgeEntity.js"
import type { IgePoint3d } from "./IgePoint3d.js"
import type { IgeBounds } from "./IgeBounds.js"
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
/**
 * Creates a new camera that will be attached to a viewport.
 */
export declare class IgeCamera extends IgeEntity {
    classId: string;
    _entity: IgeViewport;
    _trackRotateTarget?: IgeEntity;
    _trackTranslateTarget?: IgeEntity;
    _trackRotateSmoothing?: number;
    _trackTranslateSmoothing?: number;
    _trackTranslateRounding?: boolean;
    _limit?: IgeBounds;
    constructor(viewport: IgeViewport);
    /**
     * Gets / sets the rectangle that the camera translate
     * will be limited to using an IgeBounds instance.
     * @param {IgeBounds=} rect
     * @return {*}
     */
    limit(rect?: IgeBounds): IgeViewport | IgeBounds | undefined;
    /**
     * Pan (tween) the camera to the new specified point in
     * the specified time.
     * @param {IgePoint3d} point The point describing the co-ordinates to pan to.
     * @param {number} durationMs The number of milliseconds to span the pan operation over.
     * @param {string=} easing Optional easing method name.
     */
    panTo(point?: IgePoint3d, durationMs?: number, easing?: string): IgeViewport;
    /**
     * Pan (tween) the camera by the new specified point in
     * the specified time.
     * @param {IgePoint3d} point The point describing the co-ordinates to pan by.
     * @param {number} durationMs The number of milliseconds to span the pan operation over.
     * @param {string=} easing Optional easing method name.
     */
    panBy(point?: IgePoint3d, durationMs?: number, easing?: string): IgeViewport;
    /**
     * Tells the camera to track the movement of the specified
     * target entity. The camera will center on the entity.
     * @param {IgeEntity} entity
     * @param {number=} smoothing Determines how quickly the camera
     * will track the target, the higher the number, the slower the
     * tracking will be.
     * @param {boolean=} rounding Sets if the smoothing system is
     * allowed to use floating point values or not. If enabled then
     * it will not use floating point values.
     * @return {*}
     */
    trackTranslate<EntityType extends IgeEntity = IgeEntity>(entity: EntityType, smoothing?: number, rounding?: boolean): IgeEntity | IgeViewport | undefined;
    /**
     * Gets / sets the `translate` tracking smoothing value.
     * @param {number=} val
     * @return {*}
     */
    trackTranslateSmoothing(val?: number): number | this | undefined;
    /**
     * Gets / sets the `translate` tracking smoothing rounding
     * either enabled or disabled. When enabled the `translate`
     * smoothing value will be rounded so that floating point
     * values are not used which can help when smoothing on a
     * scene that has texture smoothing disabled so sub-pixel
     * rendering doesn't work and objects appear to "snap"
     * into position as the smoothing interpolates.
     * @param {Boolean=} val
     * @return {*}
     */
    trackTranslateRounding(val?: boolean): boolean | this | undefined;
    /**
     * Stops tracking the current tracking target's translation.
     */
    unTrackTranslate(): void;
    /**
     * Tells the camera to track the rotation of the specified
     * target entity.
     * @param {IgeEntity} entity
     * @param {number=} smoothing Determines how quickly the camera
     * will track the target, the higher the number, the slower the
     * tracking will be.
     * @return {*}
     */
    trackRotate(entity?: IgeEntity, smoothing?: number): IgeEntity | IgeViewport | undefined;
    /**
     * Gets / sets the `rotate` tracking smoothing value.
     * @param {number=} val
     * @return {*}
     */
    trackRotateSmoothing(val?: number): number | this | undefined;
    /**
     * Stops tracking the current tracking target.
     */
    unTrackRotate(): void;
    /**
     * Translates the camera to the center of the specified entity so
     * that the camera is "looking at" the entity.
     * @param {IgeEntity} entity The entity to look at.
     * @param {number=} durationMs If specified, will cause the
     * camera to tween to the location of the entity rather than
     * snapping to it instantly.
     * @param {string=} easing The easing method name to use if
     * tweening by duration.
     * @return {*}
     */
    lookAt(entity?: IgeEntity, durationMs?: number, easing?: string): this;
    update(): void;
    /**
     * Process operations during the engine tick.
     * @param {CanvasRenderingContext2D} ctx
     */
    tick(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Checks the current transform values against the previous ones. If
     * any value is different, the appropriate method is called which will
     * update the transformation matrix accordingly. This version of the
     * method is specifically designed for cameras!
     */
    updateTransform(): this;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @private
     * @return {string}
     */
    _stringify(): string;
}
