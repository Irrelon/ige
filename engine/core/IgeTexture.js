// TODO: Convert doc comments to the JSDoc format
/**
 * Creates a new texture from an image file.
 */
var IgeTexture = IgeEventingClass.extend({
	classId: 'IgeTexture',
	IgeTexture: true,

	init: function (url) {
		/* CEXCLUDE */
		// If on a server, import the relevant libraries
		if (ige.isServer) {
			this.log('Cannot create a texture on the server. Textures are only client-side objects. Please alter your code so that you don\'t try to load a texture on the server-side using something like an if statement around your texture laoding such as "if (!ige.isServer) {}".', 'error');
			return this;
			this.imageMagic = require(modulePath + 'easyimage');
			this.vm = require('vm');
			this.fs = require('fs');
		}
		/* CEXCLUDE */

		// Create an array that is used to store cell dimensions
		this._cells = [];
		this._smoothing = ige._globalSmoothing;

		// Load the texture URL
		if (url) {
			this.url(url);
		}
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
	 * Gets / sets the source file for this texture.
	 * @param {String=} url "The url used to load the file for this texture.
	 * @return {*}
	 */
	url: function (url) {
		if (url !== undefined) {
			this._url = url;

			if (url.substr(url.length - 2, 2) === 'js') {
				// This is a script-based texture, load the script
				this._loadScript(url);
			} else {
				// This is an image-based texture, load the image
				this._loadImage(url);
			}

			return this;
		}

		return this._url;
	},

	/**
	 * Loads an image into an img tag and sets an onload event
	 * to capture when the image has finished loading.
	 * @param {String} imageUrl The image url used to load the
	 * image data.
	 * @private
	 */
	_loadImage: function (imageUrl) {
		var image,
			self = this;

		if (!ige.isServer) {
			// Increment the texture load count
			ige.textureLoadStart(imageUrl, this);

			if (!ige._textureImageStore[imageUrl]) {
				// Create the image object
				image = ige._textureImageStore[imageUrl] = this.image = this._originalImage = new Image();
				image._igeTextures = image._igeTextures || [];

				// Add this texture to the textures that are using this image
				image._igeTextures.push(this);

				image.onload = function () {
					// Mark the image as loaded
					this._loaded = true;

					// Log success
					ige.log('Texture image "' + imageUrl + '" loaded successfully');

					// Loop textures that are using this image
					var arr = this._igeTextures,
						arrCount = arr.length, i,
						item;

					for (i = 0; i < arrCount; i++) {
						item = arr[i];

						item._mode = 0;

						item.sizeX(image.width);
						item.sizeY(image.height);

						item._cells[1] = [0, 0, item._sizeX, item._sizeY];

						item._loaded = true;
						item.emit('loaded');

						// Inform the engine that this image has loaded
						ige.textureLoadEnd(imageUrl, self);
					}
				};

				// Start the image loading by setting the source url
				image.src = imageUrl;
			} else {
				// Grab the cached image object
				image = this.image = this._originalImage = ige._textureImageStore[imageUrl];

				// Add this texture to the textures that are using this image
				image._igeTextures.push(this);

				if (image._loaded) {
					// The cached image object is already loaded so
					// fire off the relevant events
					self._mode = 0;

					self.sizeX(image.width);
					self.sizeY(image.height);

					if (image.width % 2) {
						this.log('This texture\'s width is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
					}

					if (image.height % 2) {
						this.log('This texture\'s height is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
					}

					self._cells[1] = [0, 0, self._sizeX, self._sizeY];

					self._loaded = true;

					// Set a timeout here so that when this event is emitted,
					// the code creating the texture is given a chance to
					// set a listener first, otherwise this will be emitted
					// but nothing will have time to register a listener!
					setTimeout(function () {
						self.emit('loaded');

						// Inform the engine that this image has loaded
						ige.textureLoadEnd(imageUrl, self);
					}, 1);
				}
			}
		}
		/* CEXCLUDE */
		if (ige.isServer) {
			ige.textureLoadStart(imageUrl, this);

			// Load the asset and get it's details
			this.imageMagic.info(imageUrl, function(err, data){
				if (!err) {
					// Assign the data to the image for later use
					self.log('Texture image "' + imageUrl + '" loaded successfully');
					self.sizeX(data.width);
					self.sizeY(data.height);

					self._cells[1] = [0, 0, self._sizeX, self._sizeY];

					self._loaded = true;
					self.emit('loaded');
					ige.textureLoadEnd(imageUrl, self);
				} else {
					console.log('Cannot execute imagemagick "identify". Is the image file valid and is imagemagick installed?', 'error', [__dirname + '/' + imageUrl, err]);
				}
			});
		}
		/* CEXCLUDE */
	},

	/**
	 * Loads a render script into a script tag and sets an onload
	 * event to capture when the script has finished loading.
	 * @param {String} scriptUrl The script url used to load the
	 * script data.
	 * @private
	 */
	_loadScript: function (scriptUrl) {
		var textures = ige.textures,
			rs_sandboxContext,
			self = this,
			scriptElem;

		ige.textureLoadStart(scriptUrl, this);

		if (!ige.isServer) {
			scriptElem = document.createElement('script');
			scriptElem.onload = function(data) {
				self.log('Texture script "' + scriptUrl + '" loaded successfully');
				// Parse the JS with evil eval and store the result in the asset
				eval(data);

				// Store the eval data (the "image" variable is declared
				// by the texture script and becomes available in this scope
				// because we evaluated it above)
				self._mode = 1;
				self.script = image;

				// Run the asset script init method
				if (typeof(image.init) === 'function') {
					image.init.apply(image, [self]);
				}

				//self.sizeX(image.width);
				//self.sizeY(image.height);

				self._loaded = true;
				self.emit('loaded');
				ige.textureLoadEnd(scriptUrl, self);
			};

			scriptElem.addEventListener('error', function () {
				self.log('Error loading smart texture script file: ' + scriptUrl, 'error');
			}, true);

			scriptElem.src = scriptUrl;
			document.getElementsByTagName('head')[0].appendChild(scriptElem);
		}

		if (ige.isServer) {
			// Load the render script code and execute it inside a new context
			rs_sandboxContext = {};
			textures.fs.readFile(scriptUrl, this.bind(function(err, data) {
				try {
					textures.vm.runInNewContext(data, rs_sandboxContext);

					// Check if the script defined an image object which is
					// required for asset scripts
					if (typeof(rs_sandboxContext.image) === 'object') {
						this.log('Texture script "' + scriptUrl + '" loaded successfully');
						// Store the image object
						var image = rs_sandboxContext.image;

						// Run the asset script init method
						if (typeof(image.init) === 'function') {
							image.init.apply(image, [ige, this]);
						}

						// Set the size of the asset based upon the script data
						this.sizeX(image.width);
						this.sizeY(image.height);

						this._loaded = true;
						self.emit('loaded');
						ige.textureLoadEnd(scriptUrl, self);
					} else {
						// The script did not define an image object!
						this.log('Error reading asset render script data. The script does not contain an image variable!', 'error', [this.url, rs_sandboxContext]);
					}
				} catch(err2) {
					// The script contained a JS error
					this.log('Error executing asset render script: ', 'error', [err2, this.url]);
				}
			}));
		}
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
					geom = entity.geometry,
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
		ige.TextureStore.pull(this);

		delete this.image;
		delete this.script;
		delete this._textureCanvas;
		delete this._textureCtx;

		this._destroyed = true;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }