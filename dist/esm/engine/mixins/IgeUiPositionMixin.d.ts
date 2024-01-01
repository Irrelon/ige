import { IgeObject } from "../core/IgeObject";
export declare const WithUiPositionMixin: <BaseClassType extends Mixin<IgeObject>>(Base: BaseClassType) => {
    new (): {
        _uiLeft?: number | undefined;
        _uiLeftPercent?: string | undefined;
        _uiCenter?: number | undefined;
        _uiCenterPercent?: string | undefined;
        _uiRight?: number | undefined;
        _uiRightPercent?: string | undefined;
        _uiTop?: number | undefined;
        _uiTopPercent?: string | undefined;
        _uiMiddle?: number | undefined;
        _uiMiddlePercent?: string | undefined;
        _uiBottom?: number | undefined;
        _uiBottomPercent?: string | undefined;
        _uiWidth?: string | number | undefined;
        _widthModifier?: number | undefined;
        _uiHeight?: string | number | undefined;
        _heightModifier?: number | undefined;
        _autoScaleX?: string | undefined;
        _autoScaleY?: string | undefined;
        _autoScaleLockAspect?: boolean | undefined;
        _uiFlex?: number | undefined;
        /**
         * Gets / sets the entity's x position relative to the left of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        left(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's x position relative to the right of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        right(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's x position relative to the center of
         * the entity parent.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        center(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the top of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        top(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the entity's y position relative to the bottom of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        bottom(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the viewport's y position relative to the middle of
         * the canvas.
         * @param {number} px
         * @param {boolean=} noUpdate
         * @return {number}
         */
        middle(px?: number | string, noUpdate?: boolean): number | any | undefined;
        /**
         * Gets / sets the geometry.x in pixels.
         * @param {number, String=} px Either the width in pixels or a percentage
         * @param {boolean=} lockAspect
         * @param {number=} modifier A value to add to the final width. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {boolean=} noUpdate
         * @return {*}
         */
        width(px?: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): any;
        /**
         * Gets / sets the geometry.y in pixels.
         * @param {number=} px
         * @param {boolean=} lockAspect
         * @param {number=} modifier A value to add to the final height. Useful when
         * you want to alter a percentage value by a certain number of pixels after
         * it has been calculated.
         * @param {boolean=} noUpdate If passed, will not recalculate AABB etc from
         * this call. Useful for performance if you intend to make subsequent calls
         * to other functions that will also cause a re-calculation, meaning we can
         * reduce the overall re-calculations to only one at the end. You must manually
         * call ._updateUiPosition() when you have made your changes.
         *
         * @return {*}
         */
        height(px?: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): any;
        flex(val?: number): number | any | undefined;
        autoScaleX(val?: string, lockAspect?: boolean): string | any | undefined;
        autoScaleY(val?: string, lockAspect?: boolean): string | any | undefined;
        /**
         * Updates the UI position of every child entity down the scenegraph
         * for this UI entity.
         * @return {*}
         */
        updateUiChildren(): any;
        /**
         * Sets the correct translation x and y for the viewport's left, right
         * top and bottom co-ordinates.
         * @private
         */
        _updateUiPosition(): void;
    };
};
