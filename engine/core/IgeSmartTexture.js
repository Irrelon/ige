/**
 * Creates a new texture from an image file.
 */
var IgeSmartTexture = IgeEventingClass.extend({
	classId: 'IgeSmartTexture',
	IgeSmartTexture: true,

	init: function (imageObject) {
		// Create an array that is used to store cell dimensions
		this._cells = [];
		this._smoothing = ige._globalSmoothing;

		// Assign the texture script object
		this.assignSmartTextureImage(imageObject);
	},

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			// Check if this ID already exists in the object register
			if (ige._register[id]) {
				// Already an object with this ID!
				this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
			} else {
				// Check if we already have an id assigned
				if (this._id && ige._register[this._id]) {
					// Unregister the old ID before setting this new one
					ige.unRegister(this);
				}

				this._id = id;

				// Now register this object with the object register
				ige.register(this);

				return this;
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = ige.newIdHex();
			ige.register(this);
		}

		return this._id;
	},

	/**
	 * Assigns a render script to the smart texture.
	 * @param {String} scriptObj The script object.
	 * @private
	 */
	assignSmartTextureImage: function (scriptObj) {
		var textures = ige.textures,
			rs_sandboxContext,
			self = this,
			scriptElem;

		//ige.textureLoadStart(scriptUrl, this);

		// Store the script data
		self._mode = 1;
		self.script = scriptObj;

		// Run the asset script init method
		if (typeof(scriptObj.init) === 'function') {
			scriptObj.init.apply(scriptObj, [self]);
		}

		//self.sizeX(image.width);
		//self.sizeY(image.height);

		self._loaded = true;
		self.emit('loaded');
		//ige.textureLoadEnd(scriptUrl, self);
	},

	/**
	 * Sets the image element that the IgeTexture will use when
	 * rendering. This is a special method not designed to be called
	 * directly by any game code and is used specifically when
	 * assigning an existing canvas element to an IgeTexture.
	 * @param {Image} imageElement The canvas / image to use as
	 * the image data for the IgeTexture.
	 * @private
	 */
	_setImage: function (imageElement) {
		var image,
			self = this;

		if (!ige.isServer) {
			// Create the image object
			image = this.image = this._originalImage = imageElement;
			image._igeTextures = image._igeTextures || [];

			// Mark the image as loaded
			image._loaded = true;

			this._mode = 0;

			this.sizeX(image.width);
			this.sizeY(image.height);

			this._cells[1] = [0, 0, this._sizeX, this._sizeY];
		}
	},

	/**
	 * Creates a new texture from a cell in the existing texture
	 * and returns the new texture.
	 * @param {Number} indexOrId The cell index or id to use.
	 * @return {*}
	 */
	textureFromCell: function (indexOrId) {
		var index;

		if (typeof(indexOrId) === 'string') {
			index = this.cellIdToIndex(indexOrId);
		} else {
			index = indexOrId;
		}

		if (this._cells[index]) {
			// Create a new IgeTexture, then draw the existing cell
			// to it's internal canvas
			var cell = this._cells[index],
				tex = new IgeTexture(),
				canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d');

			canvas.width = cell[2];
			canvas.height = cell[3];

			// Draw the cell to the canvas
			ctx.drawImage(
				this._originalImage,
				cell[0],
				cell[1],
				cell[2],
				cell[3],
				0,
				0,
				cell[2],
				cell[3]
			);

			// Set the new texture's image to the canvas
			tex._setImage(canvas);

			// Returnt the new texture
			return tex;
		} else {
			this.log('Unable to create new texture from passed cell index because the cell does not exist!', 'warning');
		}

		return false;
	},

	/**
	 * Sets the _sizeX property.
	 * @param {Number} val
	 */
	sizeX: function (val) {
		this._sizeX = val;
	},

	/**
	 * Sets the _sizeY property.
	 * @param {Number} val
	 */
	sizeY: function (val) {
		this._sizeY = val;
	},

	/**
	 * Resizes the original texture image to a new size. This alters
	 * the image that the texture renders so all entities that use
	 * this texture will output the newly resized version of the image.
	 * @param {Number} x The new width.
	 * @param {Number} y The new height.
	 * @param {Boolean=} dontDraw If true the resized image will not be
	 * drawn to the texture canvas. Useful for just resizing the texture
	 * canvas and not the output image. Use in conjunction with the
	 * applyFilter() and preFilter() methods.
	 */
	resize: function (x, y, dontDraw) {
		if (this._originalImage) {
			if (!this._textureCtx) {
				// Create a new canvas
				this._textureCanvas = document.createElement('canvas');
			}

			this._textureCanvas.width = x;
			this._textureCanvas.height = y;
			this._textureCtx = this._textureCanvas.getContext('2d');

			if (!dontDraw) {
				// Draw the original image to the new canvas
				// scaled as required
				this._textureCtx.drawImage(
					this._originalImage,
					0,
					0,
					this._originalImage.width,
					this._originalImage.height,
					0,
					0,
					x,
					y
				);
			}

			// Swap the current image for this new canvas
			this.image = this._textureCanvas;
		}
	},

	/**
	 * Sets the texture image back to the original image that the
	 * texture first loaded. Useful if you have applied filters
	 * or resized the image and now want to revert back to the
	 * original.
	 */
	restoreOriginal: function () {
		this.image = this._originalImage;
		delete this._textureCtx;
		delete this._textureCanvas;
	},

	smoothing: function (val) {
		if (val !== undefined) {
			this._smoothing = val;
			return this;
		}

		return this._smoothing;
	},

	/**
	 * Renders the texture image to the passed canvas context.
	 * @param {CanvasContext2d} ctx The canvas context to draw to.
	 * @param {IgeEntity} entity The entity that this texture is
	 * being drawn for.
	 */
	render: function (ctx, entity) {
		// Check that the cell is not set to null. If it is then
		// we don't render anything which effectively makes the
		// entity "blank"
		if (entity._cell !== null) {
			if (!this._smoothing) {
				ige._ctx.imageSmoothingEnabled = false;
				ige._ctx.webkitImageSmoothingEnabled = false;
				ige._ctx.mozImageSmoothingEnabled = false;
			} else {
				ige._ctx.imageSmoothingEnabled = true;
				ige._ctx.webkitImageSmoothingEnabled = true;
				ige._ctx.mozImageSmoothingEnabled = true;
			}

			if (this._mode === 0) {
				// This texture is image-based
				var cell = this._cells[entity._cell],
					geom = entity._geometry,
					poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method

				if (cell) {
					if (this._preFilter && this._textureCtx) {
						// Call the preFilter method
						this._textureCtx.save();
						this._preFilter(this._textureCanvas, this._textureCtx, this._originalImage, this, this._preFilterData);
						this._textureCtx.restore();
					}

					ctx.drawImage(
						this.image,
						cell[0], // texture x
						cell[1], // texture y
						cell[2], // texture width
						cell[3], // texture height
						poly.x, // render x
						poly.y, // render y
						geom.x, // render width
						geom.y // render height
					);

					ige._drawCount++;
				} else {
					this.log('Cannot render texture using cell ' + entity._cell + ' because the cell does not exist in the assigned texture!', 'error');
				}
			}

			if (this._mode === 1) {
				// This texture is script-based (a "smart texture")
				ctx.save();
					this.script.render(ctx, entity, this);
				ctx.restore();

				ige._drawCount++;
			}
		}
	},

	/**
	 * Gets / sets the pre-filter method that will be called before
	 * the texture is rendered and will allow you to modify the texture
	 * image before rendering each tick.
	 * @param method
	 * @return {*}
	 */
	preFilter: function (method, data) {
		if (method !== undefined) {
			if (this._originalImage) {
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');

					this._textureCanvas.width = this._originalImage.width;
					this._textureCanvas.height = this._originalImage.height;
					this._textureCtx = this._textureCanvas.getContext('2d');
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;

				// Store the pre-filter method
				this._preFilter = method;
				this._preFilterData = data;
			}
			return this;
		} else {
			this.log('Cannot use pre-filter, no filter method was passed!', 'warning');
		}

		return this._preFilter;
	},

	/**
	 * Applies a filter to the texture. The filter is a method that will
	 * take the canvas, context and originalImage parameters and then
	 * use context calls to alter / paint the context with the texture
	 * and any filter / adjustments that you want to apply.
	 * @param {Function} method
	 * @param {Object=} data
	 * @return {*}
	 */
	applyFilter: function (method, data) {
		if (method !== undefined) {
			if (this._originalImage) {
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');

					this._textureCanvas.width = this._originalImage.width;
					this._textureCanvas.height = this._originalImage.height;
					this._textureCtx = this._textureCanvas.getContext('2d');
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;

				// Call the passed method
				this._textureCtx.save();
				method(this._textureCanvas, this._textureCtx, this._originalImage, this, data);
				this._textureCtx.restore();
			}
		} else {
			this.log('Cannot apply filter, no filter method was passed!', 'warning');
		}

		return this;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this._url + "')";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "')";

		// Now get all other properties
		str += this._stringify();

		return str;
	},

	/**
	 * Destroys the item.
	 */
	destroy: function () {
		delete this._eventListeners;

		// Remove us from the image store reference array
		if (this.image && this.image._igeTextures) {
			this.image._igeTextures.pull(this);
		}

		// Remove the texture from the texture store
		ige._textureStore.pull(this);

		delete this.image;
		delete this.script;
		delete this._textureCanvas;
		delete this._textureCtx;

		this._destroyed = true;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSmartTexture; }