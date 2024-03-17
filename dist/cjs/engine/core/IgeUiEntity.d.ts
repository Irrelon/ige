import { IgeEntity } from "../../export/exports.js"
import type { IgeObject } from "../../export/exports.js"
import type { IgeTexture } from "../../export/exports.js"
import type { IgeCanvasRenderingContext2d } from "../../export/exports.js"
import type { IgePointXY } from "../../export/exports.js"
import type { IgeRepeatType } from "../../export/exports.js"
/**
 * Creates a new UI entity. UI entities use more resources and CPU
 * than standard IgeEntity instances so only use them if an IgeEntity
 * won't do the job.
 */
export declare class IgeUiEntity extends IgeEntity {
    classId: string;
    _color: string | CanvasGradient | CanvasPattern;
    _patternRepeat?: IgeRepeatType;
    _patternTexture?: IgeTexture;
    _backgroundSize: IgePointXY;
    _backgroundPosition: IgePointXY;
    _patternWidth?: number;
    _patternHeight?: number;
    _patternFill?: CanvasPattern;
    _backgroundColor?: string | CanvasGradient | CanvasPattern;
    _borderColor?: string;
    _borderLeftColor?: string;
    _borderTopColor?: string;
    _borderRightColor?: string;
    _borderBottomColor?: string;
    _borderWidth: number;
    _borderLeftWidth: number;
    _borderTopWidth: number;
    _borderRightWidth: number;
    _borderBottomWidth: number;
    _borderRadius: number;
    _borderTopLeftRadius: number;
    _borderTopRightRadius: number;
    _borderBottomRightRadius: number;
    _borderBottomLeftRadius: number;
    _padding?: number;
    _paddingLeft: number;
    _paddingTop: number;
    _paddingRight: number;
    _paddingBottom: number;
    _margin?: number;
    _marginLeft: number;
    _marginTop: number;
    _marginRight: number;
    _marginBottom: number;
    _uiLeft?: number;
    _uiLeftPercent?: string;
    _uiCenter?: number;
    _uiCenterPercent?: string;
    _uiRight?: number;
    _uiRightPercent?: string;
    _uiTop?: number;
    _uiTopPercent?: string;
    _uiMiddle?: number;
    _uiMiddlePercent?: string;
    _uiBottom?: number;
    _uiBottomPercent?: string;
    _uiWidth?: number | string;
    _widthModifier?: number;
    _uiHeight?: number | string;
    _heightModifier?: number;
    _autoScaleX?: string;
    _autoScaleY?: string;
    _autoScaleLockAspect?: boolean;
    _uiFlex?: number;
    _disabled?: boolean;
    _display?: string;
    _overflow?: string;
    disabled(): boolean | undefined;
    disabled(val: boolean): this;
    display(): string | undefined;
    display(val: string): this;
    overflow(): string | undefined;
    overflow(val: string): this;
    cell(): number | null;
    cell(val: number | null): this;
    mount(obj: IgeObject): this;
    tick(ctx: IgeCanvasRenderingContext2d, dontTransform?: boolean): void;
    /**
     * Handles screen resize events.
     * @param event
     * @private
     */
    _resizeEvent(event?: Event): void;
    _updateStyle(): void;
    /**
     * Gets / sets the entity's x position relative to the left of
     * the canvas.
     */
    left(): number | undefined;
    left(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the entity's x position relative to the right of
     * the canvas.
     */
    right(): number | undefined;
    right(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the viewport's x position relative to the center of
     * the entity parent.
     */
    center(): number | undefined;
    center(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the entity's y position relative to the top of
     * the canvas.
     */
    top(): number | undefined;
    top(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the entity's y position relative to the bottom of
     * the canvas.
     */
    bottom(): number | undefined;
    bottom(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the viewport's y position relative to the middle of
     * the canvas.
     */
    middle(): number | undefined;
    middle(px: number | string, noUpdate?: boolean): this;
    /**
     * Gets / sets the geometry.x in pixels.
     * @param {number | string=} px Either the width in pixels or a percentage
     * @param {Boolean=} lockAspect
     * @param {number=} modifier A value to add to the final width. Useful when
     * you want to alter a percentage value by a certain number of pixels after
     * it has been calculated.
     * @param {Boolean=} noUpdate
     * @return {*}
     */
    width(): number;
    width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    /**
     * Gets / sets the geometry.y in pixels.
     * @param {number|string=} px
     * @param {Boolean=} lockAspect
     * @param {number=} modifier A value to add to the final height. Useful when
     * you want to alter a percentage value by a certain number of pixels after
     * it has been calculated.
     * @param {Boolean=} noUpdate If passed, will not recalculate AABB etc. from
     * this call. Useful for performance if you intend to make subsequent calls
     * to other functions that will also cause a re-calculation, meaning we can
     * reduce the overall re-calculations to only one at the end. You must manually
     * call ._updateUiPosition() when you have made your changes.
     *
     * @return {*}
     */
    height(): number;
    height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    flex(): number | undefined;
    flex(val?: number): this;
    autoScaleX(): string | undefined;
    autoScaleX(val: string, lockAspect: boolean): this;
    autoScaleY(): string | undefined;
    autoScaleY(val: string, lockAspect: boolean): this;
    /**
     * Updates the UI position of every child entity down the scenegraph
     * for this UI entity.
     * @return {*}
     */
    updateUiChildren(): this;
    /**
     * Sets the correct translation x and y for the viewport's left, right
     * top and bottom co-ordinates.
     * @private
     */
    _updateUiPosition(): void;
    /**
     * Gets / sets the color to use as the font color.
     */
    color(): string | CanvasGradient | CanvasPattern;
    color(color: string | CanvasGradient | CanvasPattern): this;
    /**
     * Sets the current background texture and the repeatType
     * to determine in which axis the image should be repeated.
     * @param {IgeTexture=} texture
     * @param {string=} repeatType Accepts "repeat", "repeat-x",
     * "repeat-y" and "no-repeat".
     * @return {*} Returns this if any parameter is specified or
     * the current background image if no parameters are specified.
     */
    backgroundImage(): CanvasPattern | undefined;
    backgroundImage(texture: IgeTexture, repeatType?: IgeRepeatType): this;
    backgroundSize(): IgePointXY;
    backgroundSize(x: number | string, y: number | string): this;
    /**
     * Gets / sets the color to use as a background when
     * rendering the UI element.
     * @param {string, CanvasGradient, CanvasPattern=} color
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    backgroundColor(): string | CanvasGradient | CanvasPattern | undefined;
    backgroundColor(color: string | CanvasGradient | CanvasPattern | undefined): this;
    /**
     * Gets / sets the position to start rendering the background image at.
     */
    backgroundPosition(): IgePointXY;
    backgroundPosition(x: number, y: number): this;
    borderColor(): string | undefined;
    borderColor(color: string): this;
    borderLeftColor(): string | undefined;
    borderLeftColor(color: string): this;
    borderTopColor(): string | undefined;
    borderTopColor(color: string): this;
    borderRightColor(): string | undefined;
    borderRightColor(color: string): this;
    borderBottomColor(): string | undefined;
    borderBottomColor(color: string): this;
    borderWidth(): number;
    borderWidth(px: number): this;
    borderLeftWidth(): number;
    borderLeftWidth(px: number): this;
    borderTopWidth(): number;
    borderTopWidth(px: number): this;
    borderRightWidth(): number;
    borderRightWidth(px: number): this;
    borderBottomWidth(): number;
    borderBottomWidth(px: number): this;
    borderRadius(): number;
    borderRadius(px: number): this;
    borderTopLeftRadius(): number;
    borderTopLeftRadius(px: number): this;
    borderTopRightRadius(): number;
    borderTopRightRadius(px: number): this;
    borderBottomLeftRadius(): number;
    borderBottomLeftRadius(px: number): this;
    borderBottomRightRadius(): number;
    borderBottomRightRadius(px: number): this;
    padding(): number | undefined;
    padding(...args: [number]): this;
    padding(...args: [number, number, number, number]): this;
    paddingX(): number;
    paddingX(px: number): this;
    paddingY(): number;
    paddingY(px: number): this;
    paddingLeft(): number;
    paddingLeft(px: number): this;
    paddingTop(): number;
    paddingTop(px: number): this;
    paddingRight(): number;
    paddingRight(px: number): this;
    paddingBottom(): number;
    paddingBottom(px: number): this;
    margin(): number | undefined;
    margin(...args: number[]): this;
    marginLeft(): number;
    marginLeft(px: number): this;
    marginTop(): number;
    marginTop(px: number): this;
    marginRight(): number;
    marginRight(px: number): this;
    marginBottom(): number;
    marginBottom(px: number): this;
    _renderBackground(ctx?: IgeCanvasRenderingContext2d): void;
    _anyBorderColor(): boolean;
    _anyBorderWidth(): boolean;
    _anyBorderRadius(): boolean;
    _borderWidthsMatch(): boolean;
    _renderBorder(ctx: IgeCanvasRenderingContext2d): void;
}
