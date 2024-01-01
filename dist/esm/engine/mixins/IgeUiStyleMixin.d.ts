import { IgeTexture } from "../core/IgeTexture";
import { IgeObject } from "../core/IgeObject";
export declare const WithUiStyleMixin: <BaseClassType extends Mixin<IgeObject>>(Base: BaseClassType) => {
    new (): {
        _color: string | CanvasGradient | CanvasPattern;
        _patternRepeat?: any;
        _patternTexture?: IgeTexture | undefined;
        _backgroundSize?: {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        _backgroundPosition?: {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        _patternWidth?: number | undefined;
        _patternHeight?: number | undefined;
        _patternFill?: CanvasPattern | undefined;
        _cell: number | null;
        _backgroundColor?: string | CanvasGradient | CanvasPattern | undefined;
        _borderColor?: string | undefined;
        _borderLeftColor?: string | undefined;
        _borderTopColor?: string | undefined;
        _borderRightColor?: string | undefined;
        _borderBottomColor?: string | undefined;
        _borderWidth?: number | undefined;
        _borderLeftWidth?: number | undefined;
        _borderTopWidth?: number | undefined;
        _borderRightWidth?: number | undefined;
        _borderBottomWidth?: number | undefined;
        _borderRadius?: number | undefined;
        _borderTopLeftRadius?: number | undefined;
        _borderTopRightRadius?: number | undefined;
        _borderBottomRightRadius?: number | undefined;
        _borderBottomLeftRadius?: number | undefined;
        _padding?: number | undefined;
        _paddingLeft?: number | undefined;
        _paddingTop?: number | undefined;
        _paddingRight?: number | undefined;
        _paddingBottom?: number | undefined;
        _margin?: number | undefined;
        _marginLeft?: number | undefined;
        _marginTop?: number | undefined;
        _marginRight?: number | undefined;
        _marginBottom?: number | undefined;
        /**
         * Gets / sets the color to use as the font color.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        color(color: string | CanvasGradient | CanvasPattern): string | CanvasGradient | CanvasPattern | any;
        /**
         * Sets the current background texture and the repeatType
         * to determine in which axis the image should be repeated.
         * @param {IgeTexture=} texture
         * @param {string=} repeatType Accepts "repeat", "repeat-x",
         * "repeat-y" and "no-repeat".
         * @return {*} Returns this if any parameter is specified or
         * the current background image if no parameters are specified.
         */
        backgroundImage(texture?: IgeTexture, repeatType?: any): CanvasPattern | any | undefined;
        backgroundSize(x?: number | string, y?: number | string): any | {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        /**
         * Gets / sets the color to use as a background when
         * rendering the UI element.
         * @param {CSSColor, CanvasGradient, CanvasPattern=} color
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        backgroundColor(color: string | CanvasGradient | CanvasPattern): string | CanvasGradient | CanvasPattern | any | undefined;
        /**
         * Gets / sets the position to start rendering the background image at.
         * @param {number=} x
         * @param {number=} y
         * @return {*} Returns this when setting the value or the current value if none is specified.
         */
        backgroundPosition(x: number, y: number): any | {
            x: number | "auto";
            y: number | "auto";
        } | undefined;
        borderColor(color?: string): string | any | undefined;
        borderLeftColor(color: string): string | any | undefined;
        borderTopColor(color: string): string | any | undefined;
        borderRightColor(color: string): string | any | undefined;
        borderBottomColor(color: string): string | any | undefined;
        borderWidth(px?: number): number | any | undefined;
        borderLeftWidth(px?: number): number | any | undefined;
        borderTopWidth(px?: number): number | any | undefined;
        borderRightWidth(px?: number): number | any | undefined;
        borderBottomWidth(px?: number): number | any | undefined;
        borderRadius(px?: number): number | any | undefined;
        borderTopLeftRadius(px?: number): number | any | undefined;
        borderTopRightRadius(px?: number): number | any | undefined;
        borderBottomLeftRadius(px?: number): number | any | undefined;
        borderBottomRightRadius(px?: number): number | any | undefined;
        padding(args_0: number): this;
        padding(args_0: number, args_1: number, args_2: number, args_3: number): this;
        paddingLeft(px?: number): number | any | undefined;
        paddingTop(px?: number): number | any | undefined;
        paddingRight(px?: number): number | any | undefined;
        paddingBottom(px?: number): number | any | undefined;
        margin(args_0: number): this;
        margin(args_0: number, args_1: number, args_2: number, args_3: number): this;
        marginLeft(px?: number): number | any | undefined;
        marginTop(px?: number): number | any | undefined;
        marginRight(px?: number): number | any | undefined;
        marginBottom(px?: number): number | any | undefined;
    };
};
