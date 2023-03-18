import IgeEntity from "./IgeEntity";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import IgeTexture from "./IgeTexture";
import { IgeRepeatType } from "../mixins/IgeUiStyleMixin";
import { IgeObject } from "./IgeObject";
import { IgePointXY } from "../../types/IgePointXY";
/**
 * Creates a new UI entity. UI entities use more resources and CPU
 * than standard IgeEntity instances so only use them if an IgeEntity
 * won't do the job.
 */
declare class IgeUiEntity extends IgeEntity {
    classId: string;
    _color: string | CanvasGradient | CanvasPattern;
    _patternRepeat?: IgeRepeatType;
    _patternTexture?: IgeTexture;
    _backgroundSize: IgePointXY;
    _backgroundPosition: IgePointXY;
    _patternWidth?: number;
    _patternHeight?: number;
    _patternFill?: CanvasPattern;
    _cell: number | null;
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
    disabled(val?: boolean): boolean | this | undefined;
    display(val?: string): string | this | undefined;
    overflow(val?: string): string | this | undefined;
    _renderBackground(ctx?: IgeCanvasRenderingContext2d): void;
    _renderBorder(ctx: IgeCanvasRenderingContext2d): void;
    cell(val: number | null): this;
    cell(): number | null;
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
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    left(px: number | string, noUpdate?: boolean): this;
    left(): number;
    /**
     * Gets / sets the entity's x position relative to the right of
     * the canvas.
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    right(px: number | string, noUpdate?: boolean): this;
    right(): number;
    /**
     * Gets / sets the viewport's x position relative to the center of
     * the entity parent.
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    center(px?: number | string, noUpdate?: boolean): number | this | undefined;
    /**
     * Gets / sets the entity's y position relative to the top of
     * the canvas.
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    top(px: number | string, noUpdate?: boolean): this;
    top(): number;
    /**
     * Gets / sets the entity's y position relative to the bottom of
     * the canvas.
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    bottom(px: number | string, noUpdate?: boolean): this;
    bottom(): number;
    /**
     * Gets / sets the viewport's y position relative to the middle of
     * the canvas.
     * @param {Number} px
     * @param {Boolean=} noUpdate
     * @return {Number}
     */
    middle(px: number | string, noUpdate?: boolean): this;
    middle(): number;
    /**
     * Gets / sets the geometry.x in pixels.
     * @param {Number, String=} px Either the width in pixels or a percentage
     * @param {Boolean=} lockAspect
     * @param {Number=} modifier A value to add to the final width. Useful when
     * you want to alter a percentage value by a certain number of pixels after
     * it has been calculated.
     * @param {Boolean=} noUpdate
     * @return {*}
     */
    width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    width(): number;
    /**
     * Gets / sets the geometry.y in pixels.
     * @param {Number=} px
     * @param {Boolean=} lockAspect
     * @param {Number=} modifier A value to add to the final height. Useful when
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
    height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    height(): number;
    flex(val?: number): number | this | undefined;
    autoScaleX(val?: string, lockAspect?: boolean): string | this | undefined;
    autoScaleY(val?: string, lockAspect?: boolean): string | this | undefined;
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
     * @param {string | CanvasGradient | CanvasPattern=} color
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    color(color?: string | CanvasGradient | CanvasPattern): this;
    color(): string | CanvasGradient | CanvasPattern;
    /**
     * Sets the current background texture and the repeatType
     * to determine in which axis the image should be repeated.
     * @param {IgeTexture=} texture
     * @param {String=} repeatType Accepts "repeat", "repeat-x",
     * "repeat-y" and "no-repeat".
     * @return {*} Returns this if any parameter is specified or
     * the current background image if no parameters are specified.
     */
    backgroundImage(texture?: IgeTexture, repeatType?: IgeRepeatType): CanvasPattern | this | undefined;
    backgroundSize(x?: number | string, y?: number | string): this | IgePointXY;
    /**
     * Gets / sets the color to use as a background when
     * rendering the UI element.
     * @param {CSSColor, CanvasGradient, CanvasPattern=} color
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    backgroundColor(color: string | CanvasGradient | CanvasPattern): this;
    backgroundColor(): string | CanvasGradient | CanvasPattern;
    /**
     * Gets / sets the position to start rendering the background image at.
     * @param {Number=} x
     * @param {Number=} y
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    backgroundPosition(x: number, y: number): this | IgePointXY;
    borderColor(color: string): this;
    borderColor(): string;
    borderLeftColor(color: string): string | this | undefined;
    borderTopColor(color: string): string | this | undefined;
    borderRightColor(color: string): string | this | undefined;
    borderBottomColor(color: string): string | this | undefined;
    borderWidth(px: number): this;
    borderWidth(): number;
    borderLeftWidth(px?: number): number | this;
    borderTopWidth(px?: number): number | this;
    borderRightWidth(px?: number): number | this;
    borderBottomWidth(px?: number): number | this;
    borderRadius(px?: number): number | this;
    borderTopLeftRadius(px?: number): number | this;
    borderTopRightRadius(px?: number): number | this;
    borderBottomLeftRadius(px?: number): number | this;
    borderBottomRightRadius(px?: number): number | this;
    padding(...args: [number]): this;
    padding(...args: [number, number, number, number]): this;
    paddingLeft(px?: number): number | this;
    paddingTop(px?: number): number | this;
    paddingRight(px?: number): number | this;
    paddingBottom(px?: number): number | this;
    margin(...args: [number]): this;
    margin(...args: [number, number, number, number]): this;
    marginLeft(px?: number): number | this | undefined;
    marginTop(px?: number): number | this;
    marginRight(px?: number): number | this;
    marginBottom(px?: number): number | this;
}
export default IgeUiEntity;
