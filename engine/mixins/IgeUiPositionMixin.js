import { ige } from "../instance";
export const WithUiPositionMixin = (Base) => class extends Base {
    /**
     * Gets / sets the entity's x position relative to the left of
     * the canvas.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    left(px, noUpdate = false) {
        if (px === undefined) {
            return this._uiLeft;
        }
        if (px === null) {
            // Remove all data
            delete this._uiLeft;
            delete this._uiLeftPercent;
        }
        else {
            delete this._uiCenter;
            delete this._uiCenterPercent;
            if (typeof px === "string") {
                // Store the percentage value
                this._uiLeftPercent = px;
                // Check if we are already mounted
                const val = parseInt(px, 10);
                let parentWidth = 0;
                if (this._parent) {
                    // We have a parent, use it's geometry
                    parentWidth = this._parent._bounds2d.x;
                }
                else if (ige.engine) {
                    // We don't have a parent so use the main canvas
                    // as a reference
                    parentWidth = ige.engine._bounds2d.x;
                }
                // Calculate real width from percentage
                this._uiLeft = (parentWidth / 100 * val) | 0;
            }
            else {
                // The value passed is not a percentage, directly assign it
                this._uiLeft = px;
                delete this._uiLeftPercent;
            }
        }
        if (!noUpdate) {
            this._updateUiPosition();
        }
        return this;
    }
    /**
     * Gets / sets the entity's x position relative to the right of
     * the canvas.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    right(px, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiRight;
                delete this._uiRightPercent;
            }
            else {
                delete this._uiCenter;
                delete this._uiCenterPercent;
                if (typeof (px) === "string") {
                    // Store the percentage value
                    this._uiRightPercent = px;
                    // Check if we are already mounted
                    const val = parseInt(px, 10);
                    let parentWidth = 0;
                    if (this._parent) {
                        // We have a parent, use it's geometry
                        parentWidth = this._parent._bounds2d.x;
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        parentWidth = ige.engine._bounds2d.x;
                    }
                    // Calculate real width from percentage
                    this._uiRight = (parentWidth / 100 * val) | 0;
                }
                else {
                    // The value passed is not a percentage, directly assign it
                    this._uiRight = px;
                    delete this._uiRightPercent;
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._uiRight;
    }
    /**
     * Gets / sets the viewport's x position relative to the center of
     * the entity parent.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    center(px, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiCenter;
                delete this._uiCenterPercent;
            }
            else {
                delete this._uiLeft;
                delete this._uiLeftPercent;
                delete this._uiRight;
                delete this._uiRightPercent;
                if (typeof (px) === "string") {
                    // Store the percentage value
                    this._uiCenterPercent = px;
                    // Check if we are already mounted
                    const val = parseInt(px, 10);
                    let parentWidth = 0;
                    if (this._parent) {
                        // We have a parent, use it's geometry
                        parentWidth = this._parent._bounds2d.x2;
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        parentWidth = ige.engine._bounds2d.x2;
                    }
                    // Calculate real width from percentage
                    this._uiCenter = (parentWidth / 100 * val) | 0;
                }
                else {
                    // The value passed is not a percentage, directly assign it
                    this._uiCenter = px;
                    delete this._uiCenterPercent;
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._uiCenter;
    }
    /**
     * Gets / sets the entity's y position relative to the top of
     * the canvas.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    top(px, noUpdate = false) {
        if (px === undefined) {
            return this._uiTop;
        }
        if (px === null) {
            // Remove all data
            delete this._uiTop;
            delete this._uiTopPercent;
            return this._uiTop;
        }
        else {
            delete this._uiMiddle;
            delete this._uiMiddlePercent;
            if (typeof px === "string") {
                // Store the percentage value
                this._uiTopPercent = px;
                // Check if we are already mounted
                const val = parseInt(px, 10);
                let parentHeight = 0;
                if (this._parent) {
                    // We have a parent, use it's geometry
                    parentHeight = this._parent._bounds2d.y;
                }
                else if (ige.engine) {
                    // We don't have a parent so use the main canvas
                    // as a reference
                    parentHeight = ige.engine._bounds2d.y;
                }
                // Calculate real width from percentage
                this._uiTop = (parentHeight / 100 * val) | 0;
            }
            else {
                // The value passed is not a percentage, directly assign it
                this._uiTop = px;
                delete this._uiTopPercent;
            }
        }
        if (!noUpdate) {
            this._updateUiPosition();
        }
        return this;
    }
    /**
     * Gets / sets the entity's y position relative to the bottom of
     * the canvas.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    bottom(px, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiBottom;
                delete this._uiBottomPercent;
            }
            else {
                delete this._uiMiddle;
                delete this._uiMiddlePercent;
                if (typeof (px) === "string") {
                    // Store the percentage value
                    this._uiBottomPercent = px;
                    // Check if we are already mounted
                    const val = parseInt(px, 10);
                    let parentHeight = 0;
                    if (this._parent) {
                        // We have a parent, use it's geometry
                        parentHeight = this._parent._bounds2d.y;
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        parentHeight = ige.engine._bounds2d.y;
                    }
                    // Calculate real width from percentage
                    this._uiBottom = (parentHeight / 100 * val) | 0;
                }
                else {
                    // The value passed is not a percentage, directly assign it
                    this._uiBottom = px;
                    delete this._uiBottomPercent;
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._uiBottom;
    }
    /**
     * Gets / sets the viewport's y position relative to the middle of
     * the canvas.
     * @param {number} px
     * @param {boolean=} noUpdate
     * @return {number}
     */
    middle(px, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiMiddle;
                delete this._uiMiddlePercent;
            }
            else {
                delete this._uiTop;
                delete this._uiTopPercent;
                delete this._uiBottom;
                delete this._uiBottomPercent;
                if (typeof (px) === "string") {
                    // Store the percentage value
                    this._uiMiddlePercent = px;
                    // Check if we are already mounted
                    const val = parseInt(px, 10);
                    let parentWidth = 0;
                    if (this._parent) {
                        // We have a parent, use it's geometry
                        parentWidth = this._parent._bounds2d.y2;
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        parentWidth = ige.engine._bounds2d.y2;
                    }
                    // Calculate real width from percentage
                    this._uiMiddle = (parentWidth / 100 * val) | 0;
                }
                else {
                    // The value passed is not a percentage, directly assign it
                    this._uiMiddle = px;
                    delete this._uiMiddlePercent;
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._uiMiddle;
    }
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
    width(px, lockAspect = false, modifier, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiWidth;
                this._bounds2d.x = 0;
                this._bounds2d.x2 = 0;
            }
            else {
                this._uiWidth = px;
                this._widthModifier = modifier !== undefined ? modifier : 0;
                if (typeof (px) === "string") {
                    if (this._parent) {
                        // Percentage
                        const parentWidth = this._parent._bounds2d.x;
                        const val = parseInt(px, 10);
                        // Calculate real width from percentage
                        const newVal = (parentWidth / 100 * val) + this._widthModifier | 0;
                        if (lockAspect) {
                            // Calculate the height from the change in width
                            const ratio = newVal / this._bounds2d.x;
                            this.height(this._bounds2d.y / ratio, false, 0, noUpdate);
                        }
                        this._bounds2d.x = newVal;
                        this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        const parentWidth = ige.engine._bounds2d.x;
                        const val = parseInt(px, 10);
                        // Calculate real height from percentage
                        this._bounds2d.x = (parentWidth / 100 * val) + this._widthModifier | 0;
                        this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
                    }
                }
                else {
                    if (lockAspect) {
                        // Calculate the height from the change in width
                        const ratio = px / this._bounds2d.x;
                        this.height(this._bounds2d.y * ratio, false, 0, noUpdate);
                    }
                    this._bounds2d.x = px;
                    this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._bounds2d.x;
    }
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
    height(px, lockAspect = false, modifier, noUpdate = false) {
        if (px !== undefined) {
            if (px === null) {
                // Remove all data
                delete this._uiHeight;
                this._bounds2d.y = 0;
                this._bounds2d.y2 = 0;
            }
            else {
                this._uiHeight = px;
                this._heightModifier = modifier !== undefined ? modifier : 0;
                if (typeof (px) === "string") {
                    if (this._parent) {
                        // Percentage
                        const parentHeight = this._parent._bounds2d.y;
                        const val = parseInt(px, 10);
                        // Calculate real height from percentage
                        // Calculate real width from percentage
                        const newVal = (parentHeight / 100 * val) + this._heightModifier | 0;
                        if (lockAspect) {
                            // Calculate the height from the change in width
                            const ratio = newVal / this._bounds2d.y;
                            this.width(this._bounds2d.x / ratio, false, 0, noUpdate);
                        }
                        this._bounds2d.y = newVal;
                        this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
                    }
                    else if (ige.engine) {
                        // We don't have a parent so use the main canvas
                        // as a reference
                        const parentHeight = ige.engine._bounds2d.y;
                        const val = parseInt(px, 10);
                        // Calculate real height from percentage
                        this._bounds2d.y = (parentHeight / 100 * val) + this._heightModifier | 0;
                        this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
                    }
                }
                else {
                    if (lockAspect) {
                        // Calculate the height from the change in width
                        const ratio = px / this._bounds2d.y;
                        this.width(this._bounds2d.x * ratio, false, 0, noUpdate);
                    }
                    this._bounds2d.y = px;
                    this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
                }
            }
            if (!noUpdate) {
                this._updateUiPosition();
            }
            return this;
        }
        return this._bounds2d.y;
    }
    flex(val) {
        if (val === undefined)
            return this._uiFlex;
        this._uiFlex = val;
        return this;
    }
    autoScaleX(val, lockAspect = false) {
        if (val !== undefined) {
            this._autoScaleX = val;
            this._autoScaleLockAspect = lockAspect;
            this._updateUiPosition();
            return this;
        }
        return this._autoScaleX;
    }
    autoScaleY(val, lockAspect = false) {
        if (val !== undefined) {
            this._autoScaleY = val;
            this._autoScaleLockAspect = lockAspect;
            this._updateUiPosition();
            return this;
        }
        return this._autoScaleY;
    }
    /**
     * Updates the UI position of every child entity down the scenegraph
     * for this UI entity.
     * @return {*}
     */
    updateUiChildren() {
        const arr = (this._children || []);
        if (!arr) {
            return this;
        }
        let arrCount = arr.length;
        while (arrCount--) {
            const arrItem = arr[arrCount];
            if (arrItem._updateUiPosition) {
                arrItem._updateUiPosition();
            }
            if (arrItem.updateUiChildren) {
                arrItem.updateUiChildren();
            }
        }
        return this;
    }
    /**
     * Sets the correct translation x and y for the viewport's left, right
     * top and bottom co-ordinates.
     * @private
     */
    _updateUiPosition() {
        if (this._parent) {
            const parentGeom = this._parent._bounds2d;
            const geomScaled = this._bounds2d.multiplyPoint(this._scale);
            /*if (this._ignoreCamera && ige._currentCamera) {
                // Handle cam ignore when calculating
                parentGeom = parentGeom.dividePoint(ige._currentCamera._scale);
            }*/
            if (this._autoScaleX) {
                // Get the percentage as an integer
                const percent = parseInt(this._autoScaleX, 10);
                // Calculate new width from percentage
                const newVal = (parentGeom.x / 100 * percent);
                // Calculate scale ratio
                const ratio = newVal / this._bounds2d.x;
                // Set the new scale
                this._scale.x = ratio;
                if (this._autoScaleLockAspect) {
                    this._scale.y = ratio;
                }
            }
            if (this._autoScaleY) {
                // Get the percentage as an integer
                const percent = parseInt(this._autoScaleY, 10);
                // Calculate new height from percentage
                const newVal = (parentGeom.y / 100 * percent);
                // Calculate scale ratio
                const ratio = newVal / this._bounds2d.y;
                // Set the new scale
                this._scale.y = ratio;
                if (this._autoScaleLockAspect) {
                    this._scale.x = ratio;
                }
            }
            if (this._uiWidth) {
                this.width(this._uiWidth, false, this._widthModifier, true);
            }
            if (this._uiHeight) {
                this.height(this._uiHeight, false, this._heightModifier, true);
            }
            if (this._uiCenterPercent) {
                this.center(this._uiCenterPercent, true);
            }
            if (this._uiMiddlePercent) {
                this.middle(this._uiMiddlePercent, true);
            }
            if (this._uiLeftPercent) {
                this.left(this._uiLeftPercent, true);
            }
            if (this._uiRightPercent) {
                this.right(this._uiRightPercent, true);
            }
            if (this._uiTopPercent) {
                this.top(this._uiTopPercent, true);
            }
            if (this._uiBottomPercent) {
                this.bottom(this._uiBottomPercent, true);
            }
            if (this._uiCenter !== undefined) {
                // The element is center-aligned
                this._translate.x = Math.floor(this._uiCenter);
            }
            else {
                // The element is not center-aligned, process left and right
                if (this._uiLeft !== undefined && this._uiRight !== undefined) {
                    // Both left and right values are set, position left and assign width to reach right
                    this.width((parentGeom.x) - this._uiLeft - this._uiRight, false, 0, true);
                    // Update translation
                    this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - (parentGeom.x2));
                }
                else {
                    if (this._uiLeft !== undefined) {
                        // Position left aligned
                        this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - (parentGeom.x2));
                    }
                    if (this._uiRight !== undefined) {
                        // Position right aligned
                        this._translate.x = Math.floor(parentGeom.x2 - geomScaled.x2 - this._uiRight);
                    }
                }
            }
            if (this._uiMiddle !== undefined) {
                // The element is middle-aligned
                this._translate.y = Math.floor(this._uiMiddle);
            }
            else {
                // The element is not middle-aligned, process top and bottom
                if (this._uiTop !== undefined && this._uiBottom !== undefined) {
                    // Both top and bottom values are set, position top and assign height to reach bottom
                    this.height((parentGeom.y) - this._uiTop - this._uiBottom, false, 0, true);
                    // Update translation
                    this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - (parentGeom.y2));
                }
                else {
                    if (this._uiTop !== undefined) {
                        // Position top aligned
                        this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - (parentGeom.y2));
                    }
                    if (this._uiBottom !== undefined) {
                        // Position bottom aligned
                        this._translate.y = Math.floor(parentGeom.y2 - geomScaled.y2 - this._uiBottom);
                    }
                }
            }
            this.emit("uiUpdate");
            this.cacheDirty(true);
        }
    }
};
