const WithUiStyleMixin = (Base) => class extends Base {
    /**
     * Gets / sets the color to use as the font color.
     * @param {CSSColor, CanvasGradient, CanvasPattern=} color
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    color(color) {
        if (color !== undefined) {
            this._color = color;
            this.cacheDirty(true);
            return this;
        }
        return this._color;
    }
    /**
     * Sets the current background texture and the repeatType
     * to determine in which axis the image should be repeated.
     * @param {IgeTexture=} texture
     * @param {String=} repeatType Accepts "repeat", "repeat-x",
     * "repeat-y" and "no-repeat".
     * @return {*} Returns this if any parameter is specified or
     * the current background image if no parameters are specified.
     */
    backgroundImage(texture, repeatType) {
        if (texture && texture.image) {
            if (!repeatType) {
                repeatType = "no-repeat";
            }
            // Store the repeatType
            this._patternRepeat = repeatType;
            // Store the texture
            this._patternTexture = texture;
            // Resize the image if required
            if (this._backgroundSize) {
                texture.resize(this._backgroundSize.x, this._backgroundSize.y);
                this._patternWidth = this._backgroundSize.x;
                this._patternHeight = this._backgroundSize.y;
            }
            else {
                this._patternWidth = texture.image.width;
                this._patternHeight = texture.image.height;
            }
            if (this._cell > 1) {
                // We are using a cell sheet, render the cell to a
                // temporary canvas and set that as the pattern image
                var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"), cellData = texture._cells[this._cell];
                canvas.width = cellData[2];
                canvas.height = cellData[3];
                ctx.drawImage(texture.image, cellData[0], cellData[1], cellData[2], cellData[3], 0, 0, cellData[2], cellData[3]);
                // Create the pattern from the texture cell
                this._patternFill = this._ige._ctx.createPattern(canvas, repeatType);
            }
            else {
                // Create the pattern from the texture
                this._patternFill = this._ige._ctx.createPattern(texture.image, repeatType);
            }
            texture.restoreOriginal();
            this.cacheDirty(true);
            return this;
        }
        return this._patternFill;
    }
    backgroundSize(x, y) {
        if (x !== undefined && y !== undefined) {
            if (typeof (x) === "string" && x !== "auto") {
                // Work out the actual size in pixels
                // from the percentage
                x = this._bounds2d.x / 100 * parseInt(x, 10);
            }
            if (typeof (y) === "string" && y !== "auto") {
                // Work out the actual size in pixels
                // from the percentage
                y = this._bounds2d.y / 100 * parseInt(y, 10);
            }
            if (x === "auto" && y === "auto") {
                this.log("Cannot set background x and y both to auto!", "error");
                return this;
            }
            else if (x === "auto") {
                if (this._patternTexture && this._patternTexture.image) {
                    // find out y change and apply it to the x
                    x = this._patternTexture.image.width * (y / this._patternTexture.image.height);
                }
                else {
                    x = this._bounds2d.x * (y / this._bounds2d.y);
                }
            }
            else if (y === "auto") {
                if (this._patternTexture && this._patternTexture.image) {
                    // find out x change and apply it to the y
                    y = this._patternTexture.image.height * (x / this._patternTexture.image.width);
                }
                else {
                    y = this._bounds2d.y * (x / this._bounds2d.x);
                }
            }
            if (x !== 0 && y !== 0) {
                this._backgroundSize = { x, y };
                // Reset the background image
                if (this._patternTexture && this._patternRepeat) {
                    this.backgroundImage(this._patternTexture, this._patternRepeat);
                }
                this.cacheDirty(true);
            }
            else {
                this.log("Cannot set background to zero-sized x or y!", "error");
            }
            return this;
        }
        return this._backgroundSize;
    }
    /**
     * Gets / sets the color to use as a background when
     * rendering the UI element.
     * @param {CSSColor, CanvasGradient, CanvasPattern=} color
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    backgroundColor(color) {
        if (color !== undefined) {
            this._backgroundColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._backgroundColor;
    }
    /**
     * Gets / sets the position to start rendering the background image at.
     * @param {Number=} x
     * @param {Number=} y
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    backgroundPosition(x, y) {
        if (x !== undefined && y !== undefined) {
            this._backgroundPosition = { x, y };
            this.cacheDirty(true);
            return this;
        }
        return this._backgroundPosition;
    }
    borderColor(color) {
        if (color !== undefined) {
            this._borderColor = color;
            this._borderLeftColor = color;
            this._borderTopColor = color;
            this._borderRightColor = color;
            this._borderBottomColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._borderColor;
    }
    borderLeftColor(color) {
        if (color !== undefined) {
            this._borderLeftColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._borderLeftColor;
    }
    borderTopColor(color) {
        if (color !== undefined) {
            this._borderTopColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._borderTopColor;
    }
    borderRightColor(color) {
        if (color !== undefined) {
            this._borderRightColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._borderRightColor;
    }
    borderBottomColor(color) {
        if (color !== undefined) {
            this._borderBottomColor = color;
            this.cacheDirty(true);
            return this;
        }
        return this._borderBottomColor;
    }
    borderWidth(px) {
        if (px !== undefined) {
            this._borderWidth = px;
            this._borderLeftWidth = px;
            this._borderTopWidth = px;
            this._borderRightWidth = px;
            this._borderBottomWidth = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderWidth;
    }
    borderLeftWidth(px) {
        if (px !== undefined) {
            this._borderLeftWidth = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderLeftWidth;
    }
    borderTopWidth(px) {
        if (px !== undefined) {
            this._borderTopWidth = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderTopWidth;
    }
    borderRightWidth(px) {
        if (px !== undefined) {
            this._borderRightWidth = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderRightWidth;
    }
    borderBottomWidth(px) {
        if (px !== undefined) {
            this._borderBottomWidth = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderBottomWidth;
    }
    borderRadius(px) {
        if (px !== undefined) {
            this._borderRadius = px;
            this._borderTopLeftRadius = px;
            this._borderTopRightRadius = px;
            this._borderBottomRightRadius = px;
            this._borderBottomLeftRadius = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderRadius;
    }
    borderTopLeftRadius(px) {
        if (px !== undefined) {
            this._borderTopLeftRadius = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderTopLeftRadius;
    }
    borderTopRightRadius(px) {
        if (px !== undefined) {
            this._borderTopRightRadius = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderTopRightRadius;
    }
    borderBottomLeftRadius(px) {
        if (px !== undefined) {
            this._borderBottomLeftRadius = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderBottomLeftRadius;
    }
    borderBottomRightRadius(px) {
        if (px !== undefined) {
            this._borderBottomRightRadius = px;
            this.cacheDirty(true);
            return this;
        }
        return this._borderBottomRightRadius;
    }
    padding(...args) {
        if (!args.length)
            return this._padding;
        if (args.length === 1) {
            // Set padding proper
            this._padding = args[0];
            this.cacheDirty(true);
            return this;
        }
        // Set padding as box (left, top, right, bottom)
        this._paddingLeft = args[0];
        this._paddingTop = args[1];
        this._paddingRight = args[2];
        this._paddingBottom = args[3];
        this.cacheDirty(true);
        return this;
    }
    paddingLeft(px) {
        if (px !== undefined) {
            this._paddingLeft = px;
            this.cacheDirty(true);
            return this;
        }
        return this._paddingLeft;
    }
    paddingTop(px) {
        if (px !== undefined) {
            this._paddingTop = px;
            this.cacheDirty(true);
            return this;
        }
        return this._paddingTop;
    }
    paddingRight(px) {
        if (px !== undefined) {
            this._paddingRight = px;
            this.cacheDirty(true);
            return this;
        }
        return this._paddingRight;
    }
    paddingBottom(px) {
        if (px !== undefined) {
            this._paddingBottom = px;
            this.cacheDirty(true);
            return this;
        }
        return this._paddingBottom;
    }
    margin(...args) {
        if (!args.length)
            return this._margin;
        if (args.length === 1) {
            // Set margin proper
            this._margin = args[0];
            this.cacheDirty(true);
            return this;
        }
        // Set margin as box (left, top, right, bottom)
        this._marginLeft = args[0];
        this._marginTop = args[1];
        this._marginRight = args[2];
        this._marginBottom = args[3];
        this.cacheDirty(true);
        return this;
    }
    marginLeft(px) {
        if (px !== undefined) {
            this._marginLeft = px;
            this.cacheDirty(true);
            return this;
        }
        return this._marginLeft !== undefined ? this._marginLeft : this._margin;
    }
    marginTop(px) {
        if (px !== undefined) {
            this._marginTop = px;
            this.cacheDirty(true);
            return this;
        }
        return this._marginTop;
    }
    marginRight(px) {
        if (px !== undefined) {
            this._marginRight = px;
            this.cacheDirty(true);
            return this;
        }
        return this._marginRight;
    }
    marginBottom(px) {
        if (px !== undefined) {
            this._marginBottom = px;
            this.cacheDirty(true);
            return this;
        }
        return this._marginBottom;
    }
};
export default WithUiStyleMixin;
