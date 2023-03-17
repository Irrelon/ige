import IgeUiEntity from "./IgeUiEntity.js";
import IgeTexture from "./IgeTexture.js";
import IgeFontSmartTexture from "../textures/IgeFontSmartTexture.js";
import { IgeFontAlignX, IgeFontAlignY } from "../../enums/IgeFontAlign.js";
import { IgeTextureRenderMode } from "../../enums/IgeTextureRenderMode.js";
/**
 * Creates a new font entity. A font entity will use a font sheet
 * (IgeFontSheet) or native font and render text.
 */
class IgeFontEntity extends IgeUiEntity {
    constructor() {
        super();
        this["classId"] = "IgeFontEntity";
        this._textAlignX = IgeFontAlignX.center;
        this._textAlignY = IgeFontAlignY.multiLineMiddle;
        this._textLineSpacing = 0;
        this._nativeMode = false;
        this._autoWrap = false;
        // Enable caching by default for font entities!
        this.cache(true);
    }
    width(px, lockAspect, modifier, noUpdate) {
        if (px !== undefined) {
            if (this._bounds2d.x !== px) {
                this.clearCache();
            }
            return super.width(px, lockAspect);
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
            return super.height(px, lockAspect);
        }
        return this._bounds2d.y;
    }
    /**
     * Sets the text to render for this font entity. This sets both
     * the private properties "_text" and "_renderText". If auto-wrapping
     * has been enabled then the "_text" remains equal to whatever
     * text you pass into this method but "_renderText" becomes the
     * line-broken text that the auto-wrapper method creates. When the
     * entity renders its text string it ALWAYS renders from "_renderText"
     * and not the value of "_text". Effectively this means that "_text"
     * contains the unaltered version of your original text and
     * "_renderText" will be either the same as "_text" if auto-wrapping
     * is disabled or a wrapped version otherwise.
     * @param {String} text The text string to render.
     * @returns {*}
     */
    text(text) {
        if (text !== undefined) {
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
        return this._text;
    }
    /**
     * Allows you to bind the text output of this font entity to match
     * the value of an object's property so that when it is updated the
     * text will automatically update on this entity. Useful for score,
     * position etc. output where data is stored in an object and changes
     * frequently.
     * @param {Object} obj The object to read the property from.
     * @param {String} propName The name of the property to read value from.
     * @param {String} preText Text to place before the output.
     * @param {String} postText Text to place after the output.
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
     * @param {String=} val The colour value as hex e.g. '#ff0000'
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
        // TODO: Maybe use .script.meta to store these properties?
        if (this._texture && this._texture._caching && this._texture._cacheText[this._renderText]) {
            delete this._texture._cacheText[this._renderText];
        }
    }
    /**
     * When using native font rendering (canvasContext.fillText())
     * this sets the font and size as per the canvasContext.font
     * string specification.
     * @param {String=} val The font style string.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
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
            const tex = new IgeTexture("igeFontSmartTexture", IgeFontSmartTexture);
            this.texture(tex);
            // Set the flag indicating we are using a native font
            this._nativeMode = true;
            return this;
        }
        return this._nativeFont;
    }
    /**
     * Gets / sets the text stroke size that applies when using
     * a native font for text rendering.
     * @param {Number=} val The size of the text stroke.
     * @return {*}
     */
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
    /**
     * Gets / sets the text stroke color that applies when using
     * a native font for text rendering.
     * @param val The color of the text stroke.
     * @return {*}
     */
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
     * text assigned to the font entity.
     * @param {String=} text Optional text to measure, used existing entity
     * text value if none is provided.
     * @returns {Number} The width of the text in pixels.
     */
    measureTextWidth(text) {
        var _a, _b, _c, _d, _e, _f;
        text = text || this._text;
        // Both IgeFontSheet and the IgeFontSmartTexture have a method
        // called measureTextWidth() so we can just asks the current
        // texture for the width :)
        if (((_a = this._texture) === null || _a === void 0 ? void 0 : _a._renderMode) === IgeTextureRenderMode.image) {
            // TODO: Figure out what this should be since it's not a smart texture, where does the function come from?
            return (_c = (_b = this._texture.script) === null || _b === void 0 ? void 0 : _b.meta) === null || _c === void 0 ? void 0 : _c.measureTextWidth(text);
        }
        else if (((_d = this._texture) === null || _d === void 0 ? void 0 : _d._renderMode) === IgeTextureRenderMode.smartTexture) {
            return (_f = (_e = this._texture.script) === null || _e === void 0 ? void 0 : _e.meta) === null || _f === void 0 ? void 0 : _f.measureTextWidth(text, this);
        }
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
     * @return {String}
     */
    _stringify() {
        // Get the properties for all the super-classes
        let str = IgeUiEntity.prototype._stringify.call(this);
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
export default IgeFontEntity;
