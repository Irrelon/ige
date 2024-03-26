"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeFontEntity = void 0;
const IgeTexture_1 = require("./IgeTexture.js");
const IgeUiEntity_1 = require("./IgeUiEntity.js");
const IgeFontSmartTexture_1 = require("../textures/IgeFontSmartTexture.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
const enums_1 = require("../../enums/index.js");
/**
 * Creates a new font entity. A font entity will use a font sheet
 * (IgeFontSheet) or native font and render text.
 */
class IgeFontEntity extends IgeUiEntity_1.IgeUiEntity {
    constructor() {
        super();
        this["classId"] = "IgeFontEntity";
        this._textAlignX = enums_1.IgeFontAlignX.center;
        this._textAlignY = enums_1.IgeFontAlignY.multiLineMiddle;
        this._textLineSpacing = 0;
        this._nativeMode = true;
        this._autoWrap = false;
        // Enable caching by default for font entities!
        this.cache(true);
    }
    width(px, lockAspect, modifier, noUpdate) {
        if (px !== undefined) {
            if (this._bounds2d.x !== px) {
                this.clearCache();
            }
            return super.width(px, lockAspect, modifier, noUpdate);
        }
        if (this._autoWrap) {
            this._applyAutoWrap();
        }
        return this._bounds2d.x;
    }
    height(px, lockAspect = false, modifier, noUpdate = false) {
        if (px !== undefined) {
            if (this._bounds2d.y !== px) {
                this.clearCache();
            }
            return super.height(px, lockAspect, modifier, noUpdate);
        }
        return this._bounds2d.y;
    }
    text(text) {
        if (text === undefined) {
            return this._text;
        }
        let wasDifferent = false;
        // Ensure we have a string
        text = String(text);
        if (this._text !== text) {
            this.clearCache();
            wasDifferent = true;
        }
        this._text = text;
        if (this._autoWrap && wasDifferent) {
            this._applyAutoWrap();
        }
        else {
            this._renderText = text;
        }
        return this;
    }
    /**
     * Allows you to bind the text output of this font entity to match
     * the value of an object's property so that when it is updated the
     * text will automatically update on this entity. Useful for score,
     * position etc. output where data is stored in an object and changes
     * frequently.
     * @param {Object} obj The object to read the property from.
     * @param {string} propName The name of the property to read value from.
     * @param {string} preText Text to place before the output.
     * @param {string} postText Text to place after the output.
     * @returns {*}
     */
    bindData(obj, propName, preText, postText) {
        if (obj !== undefined && propName !== undefined) {
            this._bindDataObject = obj;
            this._bindDataProperty = propName;
            this._bindDataPreText = preText || "";
            this._bindDataPostText = postText || "";
        }
        return this;
    }
    textAlignX(val) {
        if (val !== undefined) {
            if (this._textAlignX !== val) {
                this.clearCache();
            }
            this._textAlignX = val;
            return this;
        }
        return this._textAlignX;
    }
    textAlignY(val) {
        if (val !== undefined) {
            if (this._textAlignY !== val) {
                this.clearCache();
            }
            this._textAlignY = val;
            return this;
        }
        return this._textAlignY;
    }
    textLineSpacing(val) {
        if (val !== undefined) {
            if (this._textLineSpacing !== val) {
                this.clearCache();
            }
            this._textLineSpacing = val;
            return this;
        }
        return this._textLineSpacing;
    }
    /**
     * Gets / sets the string hex or rgba value of the colour
     * to use as an overlay when rending this entity's texture.
     * @param {string=} val The colour value as hex e.g. '#ff0000'
     * or as rgba e.g. 'rbga(255, 0, 0, 0.5)'. To remove an overlay
     * colour simply passed an empty string.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    colorOverlay(val) {
        if (val !== undefined) {
            if (this._colorOverlay !== val) {
                this.clearCache();
            }
            this._colorOverlay = val;
            return this;
        }
        return this._colorOverlay;
    }
    color(val) {
        return this.colorOverlay(val);
    }
    /**
     * Clears the texture cache for this entity's text string.
     */
    clearCache() {
        if (this._cache) {
            this.cacheDirty(true);
        }
        // TODO: Commented this as it is not used anywhere!
        // if (this._texture && this._texture._caching && this._texture._cacheText[this._renderText]) {
        // 	delete this._texture._cacheText[this._renderText];
        // }
    }
    nativeFont(val) {
        if (val !== undefined) {
            // Check if this font is different from the current
            // assigned font
            if (this._nativeFont !== val) {
                // The fonts are different, clear existing cache
                this.clearCache();
            }
            this._nativeFont = val;
            // Assign the native font smart texture
            const tex = new IgeTexture_1.IgeTexture("igeFontSmartTexture", IgeFontSmartTexture_1.IgeFontSmartTexture);
            this.texture(tex);
            // Set the flag indicating we are using a native font
            this._nativeMode = true;
            return this;
        }
        return this._nativeFont;
    }
    nativeStroke(val) {
        if (val !== undefined) {
            if (this._nativeStroke !== val) {
                this.clearCache();
            }
            this._nativeStroke = val;
            return this;
        }
        return this._nativeStroke;
    }
    nativeStrokeColor(val) {
        if (val !== undefined) {
            if (this._nativeStrokeColor !== val) {
                this.clearCache();
            }
            this._nativeStrokeColor = val;
            return this;
        }
        return this._nativeStrokeColor;
    }
    /**
     * Gets / sets the auto-wrapping mode. If set to true then the
     * text this font entity renders will be automatically line-broken
     * when a line reaches the width of the entity.
     * @param val
     * @returns {*}
     */
    autoWrap(val) {
        if (val !== undefined) {
            this._autoWrap = val;
            // Execute an auto-wrap modification of the text
            if (this._text) {
                this._applyAutoWrap();
                this.clearCache();
            }
            return this;
        }
        return this._autoWrap;
    }
    /**
     * Automatically detects where line-breaks need to occur in the text
     * assigned to the entity and adds them.
     * @private
     */
    _applyAutoWrap() {
        if (this._text) {
            // Un-wrap the text so it is all on one line
            const oneLineText = this._text.replace(/\n/g, " ");
            const textArray = [];
            let wordIndex;
            let currentTextLine = "";
            let lineWidth;
            // Break the text into words
            const words = oneLineText.split(" ");
            // There are multiple words - loop the words
            for (wordIndex = 0; wordIndex < words.length; wordIndex++) {
                if (currentTextLine) {
                    currentTextLine += " ";
                }
                currentTextLine += words[wordIndex];
                // Check the width and if greater than the width of the entity,
                // add a line break before the word
                lineWidth = this.measureTextWidth(currentTextLine);
                if (lineWidth >= this._bounds2d.x) {
                    // Start a new line
                    currentTextLine = words[wordIndex];
                    // Add a line break
                    textArray.push("\n" + words[wordIndex]);
                }
                else {
                    textArray.push(words[wordIndex]);
                }
            }
            this._renderText = textArray.join(" ");
        }
    }
    /**
     * Will measure and return the width in pixels of a line or multiple
     * lines of text. If no text parameter is passed, will use the current
     * text assigned to the font entity. If the text cannot be measured,
     * -1 is returned instead.
     * @param {string=} text Optional text to measure, used existing entity
     * text value if none is provided.
     * @returns {number} The width of the text in pixels.
     */
    measureTextWidth(text) {
        var _a, _b, _c, _d;
        text = text || this._text || " ";
        // Both IgeFontSheet and the IgeFontSmartTexture have a method
        // called measureTextWidth() so we can just ask the current
        // texture for the width :)
        if (((_a = this._texture) === null || _a === void 0 ? void 0 : _a._renderMode) === enums_1.IgeTextureRenderMode.image) {
            return this._texture.measureTextWidth(text) || -1;
        }
        else if (((_b = this._texture) === null || _b === void 0 ? void 0 : _b._renderMode) === enums_1.IgeTextureRenderMode.smartTexture) {
            return ((_d = (_c = this._texture.script) === null || _c === void 0 ? void 0 : _c.meta) === null || _d === void 0 ? void 0 : _d.measureTextWidth(text, this)) || -1;
        }
        return -1;
    }
    tick(ctx) {
        // Check for an auto-progress update
        if (this._bindDataObject && this._bindDataProperty) {
            if (!this._bindDataObject._alive) {
                // The object we have bind data from has been
                // destroyed so release our reference to it!
                delete this._bindDataObject;
            }
            else {
                this.text(this._bindDataPreText + this._bindDataObject[this._bindDataProperty] + this._bindDataPostText);
            }
        }
        super.tick(ctx);
    }
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {string}
     */
    _stringify() {
        // Get the properties for all the super-classes
        let str = IgeUiEntity_1.IgeUiEntity.prototype._stringify.call(this);
        let i;
        // Loop properties and add property assignment code to string
        for (i in this) {
            if (this.hasOwnProperty(i) && this[i] !== undefined) {
                switch (i) {
                    case "_text":
                        str += ".text(" + this.text() + ")";
                        break;
                    case "_textAlignX":
                        str += ".textAlignX(" + this.textAlignX() + ")";
                        break;
                    case "_textAlignY":
                        str += ".textAlignY(" + this.textAlignY() + ")";
                        break;
                    case "_textLineSpacing":
                        str += ".textLineSpacing(" + this.textLineSpacing() + ")";
                        break;
                }
            }
        }
        return str;
    }
}
exports.IgeFontEntity = IgeFontEntity;
(0, igeClassStore_1.registerClass)(IgeFontEntity);
