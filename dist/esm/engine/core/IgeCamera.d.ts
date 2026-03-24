import { IgeEntity } from "./IgeEntity.js"
import type { IgePoint3d } from "./IgePoint3d.js"
import type { IgeBounds } from "./IgeBounds.js"
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeTweenEasingFunctions } from "../utils/easing.js"
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
    _projectionType: "perspective" | "orthographic";
    _fov: number;
    _near: number;
    _far: number;
    _orthoSize: number;
    _lookAt?: IgePoint3d;
    _preset?: string;
    constructor(viewport: IgeViewport);
    /**
     * Gets / sets the rectangle that the camera translate
     * will be limited to using an IgeBounds instance.
     * @param {IgeBounds=} rect
     * @return {*}
     */
    limit(rect?: IgeBounds): IgeBounds | IgeViewport | undefined;
    /**
     * Pan (tween) the camera to the new specified point in
     * the specified time.
     * @param {IgePoint3d} point The point describing the co-ordinates to pan to.
     * @param {number} durationMs The number of milliseconds to span the pan operation over.
     * @param {string=} easing Optional easing method name.
     */
    panTo(point?: IgePoint3d, durationMs?: number, easing?: IgeTweenEasingFunctions): IgeViewport;
    /**
     * Pan (tween) the camera by the new specified point in
     * the specified time.
     * @param {IgePoint3d} point The point describing the co-ordinates to pan by.
     * @param {number} durationMs The number of milliseconds to span the pan operation over.
     * @param {string=} easing Optional easing method name.
     */
    panBy(point?: IgePoint3d, durationMs?: number, easing?: IgeTweenEasingFunctions): IgeViewport;
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
    trackTranslate<EntityType extends IgeEntity = IgeEntity>(entity: EntityType, smoothing?: number, rounding?: boolean): IgeViewport | IgeEntity | undefined;
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
    trackRotate(entity?: IgeEntity, smoothing?: number): IgeViewport | IgeEntity | undefined;
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
    lookAt(entity?: IgeEntity, durationMs?: number, easing?: IgeTweenEasingFunctions): this;
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
    /**
     * Gets / sets the camera projection type for 3D rendering.
     * @param {string=} type Either "perspective" or "orthographic".
     * @return {*}
     */
    projectionType(type?: "perspective" | "orthographic"): this | "perspective" | "orthographic";
    /**
     * Gets / sets the camera field of view in degrees (for perspective projection).
     * @param {number=} degrees Field of view in degrees.
     * @return {*}
     */
    fov(degrees?: number): number | this;
    /**
     * Gets / sets the camera near clipping plane distance.
     * @param {number=} distance Near plane distance.
     * @return {*}
     */
    near(distance?: number): number | this;
    /**
     * Gets / sets the camera far clipping plane distance.
     * @param {number=} distance Far plane distance.
     * @return {*}
     */
    far(distance?: number): number | this;
    /**
     * Gets / sets the camera orthographic view size (height).
     * @param {number=} size Orthographic view height.
     * @return {*}
     */
    orthoSize(size?: number): number | this;
    /**
     * Gets / sets the 3D point the camera looks at.
     * Used by WebGL renderer for view matrix calculation.
     * @param {IgePoint3d=} point The point to look at.
     * @return {*}
     */
    lookAtPoint(point?: IgePoint3d): IgePoint3d | this | undefined;
    /**
     * Applies a camera preset configuration.
     * Available presets:
     * - "isometric": Classic isometric view (35.264° pitch, orthographic)
     * - "isometric45": Isometric rotated 45° around Y
     * - "topDown": Top-down orthographic view
     * - "sideScroller": Side view for 2D platformers
     *
     * @param {string} presetName The name of the preset to apply.
     * @param {number=} distance Distance from the look-at target (default: 500).
     * @return {*}
     */
    preset(presetName?: string, distance?: number): string | this | undefined;
}
