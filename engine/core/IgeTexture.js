/**
 * Creates a new texture.
 */
var IgeTexture = IgeEventingClass.extend({
	classId: 'IgeTexture',
	IgeTexture: true,

	/**
	 * Constructor for a new IgeTexture.
	 * @param {String, Object} urlOrObject Either a string URL that
	 * points to the path of the image or script you wish to use as
	 * the texture image, or an object containing a smart texture.
	 * @return {*}
	 */
	init: function (urlOrObject) {
		this._loaded = false;
		
		/* CEXCLUDE */
		// If on a server, error
		if (ige.isServer) {
			this.log('Cannot create a texture on the server. Textures are only client-side objects. Please alter your code so that you don\'t try to load a texture on the server-side using something like an if statement around your texture laoding such as "if (ige.isClient) {}".', 'error');
			return this;
		}
		/* CEXCLUDE */

		// Create an array that is used to store cell dimensions
		this._cells = [];
		this._smoothing = ige._globalSmoothing;
		
		// Instantiate filter lists for filter combinations
		this._applyFilters = [];
		this._applyFiltersData = [];
		this._preFilters = [];
		this._preFiltersData = [];

		var type = typeof(urlOrObject);

		if (type === 'string') {
			// Load the texture URL
			if (urlOrObject) {
				this.url(urlOrObject);
			}
		}

		if (type === 'object') {
			// Assign the texture script object
			this.assignSmartTextureImage(urlOrObject);
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
				if (ige._register[id] === this) {
					// We are already registered as this id
					return this;
				}
				
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
			if (this._url) {
				// Generate an ID from the URL string of the image
				// this texture is using. Useful for always reproducing
				// the same ID for the same texture :)
				this._id = ige.newIdFromString(this._url);
			} else {
				// We don't have a URL so generate a random ID
				this._id = ige.newIdHex();
			}
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

		if (ige.isClient) {
			// Increment the texture load count
			ige.textureLoadStart(imageUrl, this);

			// Check if the image url already exists in the image cache
			if (!ige._textureImageStore[imageUrl]) {
				// Image not in cache, create the image object
				image = ige._textureImageStore[imageUrl] = this.image = this._originalImage = new Image();
				image._igeTextures = image._igeTextures || [];

				// Add this texture to the textures that are using this image
				image._igeTextures.push(this);

				image.onload = function () {
					// Mark the image as loaded
					image._loaded = true;

					// Log success
					ige.log('Texture image (' + imageUrl + ') loaded successfully');

					/*if (image.width % 2) {
						self.log('The texture ' + imageUrl + ' width (' + image.width + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture width is divisible by 2!', 'warning');
					}

					if (image.height % 2) {
						self.log('The texture ' + imageUrl + ' height (' + image.height + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture height is divisible by 2!', 'warning');
					}*/

					// Loop textures that are using this image
					var arr = image._igeTextures,
						arrCount = arr.length, i,
						item;

					for (i = 0; i < arrCount; i++) {
						item = arr[i];

						item._mode = 0;

						item.sizeX(image.width);
						item.sizeY(image.height);

						item._cells[1] = [0, 0, item._sizeX, item._sizeY];
						
						// Mark texture as loaded
						item._textureLoaded();
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
					
					// Mark texture as loaded
					self._textureLoaded();
				}
			}
		}
	},
	
	_textureLoaded: function () {
		var self = this;
		
		// Set a timeout here so that when this event is emitted,
		// the code creating the texture is given a chance to
		// set a listener first, otherwise this will be emitted
		// but nothing will have time to register a listener!
		setTimeout(function () {
			self._loaded = true;
			self.emit('loaded');

			// Inform the engine that this image has loaded
			ige.textureLoadEnd(self.image.src, self);
		}, 5);
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

		if (ige.isClient) {
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
		
		// Check the object has a render method
		if (typeof(scriptObj.render) === 'function') {
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
		} else {
			this.log('Cannot assign smart texture because it doesn\'t have a render() method!', 'error');
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

		if (ige.isClient) {
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
	 * @param {Number, String} indexOrId The cell index or id to use.
	 * @return {*}
	 */
	textureFromCell: function (indexOrId) {
		var tex = new IgeTexture(),
			self = this;

		if (this._loaded) {
			this._textureFromCell(tex, indexOrId);
		} else {
			// The texture has not yet loaded, return the new texture and set a listener to handle
			// when this texture has loaded so we can assign the texture's image properly
			this.on('loaded', function () {
				self._textureFromCell(tex, indexOrId);
			})
		}

		return tex;
	},

	/**
	 * Called by textureFromCell() when the texture is ready
	 * to be processed. See textureFromCell() for description.
	 * @param {IgeTexture} tex The new texture to paint to.
	 * @param {Number, String} indexOrId The cell index or id
	 * to use.
	 * @private
	 */
	_textureFromCell: function (tex, indexOrId) {
		var index,
			cell,
			canvas,
			ctx;

		if (typeof(indexOrId) === 'string') {
			index = this.cellIdToIndex(indexOrId);
		} else {
			index = indexOrId;
		}

		if (this._cells[index]) {
			// Create a new IgeTexture, then draw the existing cell
			// to it's internal canvas
			cell = this._cells[index];
			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d');

			// Set smoothing mode
			// TODO: Does this cause a costly context change? If so maybe we set a global value to keep
			// TODO: track of the value and evaluate first before changing?
			if (!this._smoothing) {
				ctx.imageSmoothingEnabled = false;
				ctx.webkitImageSmoothingEnabled = false;
				ctx.mozImageSmoothingEnabled = false;
			} else {
				ctx.imageSmoothingEnabled = true;
				ctx.webkitImageSmoothingEnabled = true;
				ctx.mozImageSmoothingEnabled = true;
			}

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
			tex._loaded = true;

			// Fire the loaded event
			setTimeout(function () {
				tex.emit('loaded');
			}, 1);
		} else {
			this.log('Unable to create new texture from passed cell index (' + indexOrId + ') because the cell does not exist!', 'warning');
		}
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
			if (this._loaded) {
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');
				}

				this._textureCanvas.width = x;
				this._textureCanvas.height = y;
				this._textureCtx = this._textureCanvas.getContext('2d');

				// Set smoothing mode
				if (!this._smoothing) {
					this._textureCtx.imageSmoothingEnabled = false;
					this._textureCtx.webkitImageSmoothingEnabled = false;
					this._textureCtx.mozImageSmoothingEnabled = false;
				} else {
					this._textureCtx.imageSmoothingEnabled = true;
					this._textureCtx.webkitImageSmoothingEnabled = true;
					this._textureCtx.mozImageSmoothingEnabled = true;
				}

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
			} else {
				this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
			}
		}
	},

	/**
	 * Resizes the original texture image to a new size based on percentage.
	 * This alters the image that the texture renders so all entities that use
	 * this texture will output the newly resized version of the image.
	 * @param {Number} x The new width.
	 * @param {Number} y The new height.
	 * @param {Boolean=} dontDraw If true the resized image will not be
	 * drawn to the texture canvas. Useful for just resizing the texture
	 * canvas and not the output image. Use in conjunction with the
	 * applyFilter() and preFilter() methods.
	 */
	resizeByPercent: function (x, y, dontDraw) {
		if (this._originalImage) {
			if (this._loaded) {
				// Calc final x/y values
				x = Math.floor((this.image.width / 100) * x);
				y = Math.floor((this.image.height / 100) * y);

				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');
				}

				this._textureCanvas.width = x;
				this._textureCanvas.height = y;
				this._textureCtx = this._textureCanvas.getContext('2d');

				// Set smoothing mode
				if (!this._smoothing) {
					this._textureCtx.imageSmoothingEnabled = false;
					this._textureCtx.webkitImageSmoothingEnabled = false;
					this._textureCtx.mozImageSmoothingEnabled = false;
				} else {
					this._textureCtx.imageSmoothingEnabled = true;
					this._textureCtx.webkitImageSmoothingEnabled = true;
					this._textureCtx.mozImageSmoothingEnabled = true;
				}

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
			} else {
				this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
			}
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
		
		this.removeFilters();
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
	 * @param {CanvasRenderingContext2d} ctx The canvas context to draw to.
	 * @param {IgeEntity} entity The entity that this texture is
	 * being drawn for.
	 */
	render: function (ctx, entity) {
		// Check that the cell is not set to null. If it is then
		// we don't render anything which effectively makes the
		// entity "blank"
		if (entity._cell !== null) {
			// TODO: Does this cause a costly context change? If so maybe we set a global value to keep
			// TODO: track of the value and evaluate first before changing?
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
					geom = entity._bounds2d,
					poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method

				if (cell) {
					if (this._preFilters.length > 0 && this._textureCtx) {
						// Call the drawing of the original image
						this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
						this._textureCtx.drawImage(this._originalImage, 0, 0);
						
						var self = this;
						// Call the applyFilter and preFilter methods one by one
						this._applyFilters.forEach(function(method, index) {
							self._textureCtx.save();
							method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._applyFiltersData[index]);
							self._textureCtx.restore();
						});
						this._preFilters.forEach(function(method, index) {
							self._textureCtx.save();
							method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._preFiltersData[index]);
							self._textureCtx.restore();
						});
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
	 * Removes a certain filter from the texture
	 * Useful if you want to keep resizings, etc. 
	 */
	removeFilter: function(method) {
		var i;
		while ((i = this._preFilters.indexOf(method)) > -1) {
			this._preFilters[i] = undefined;
			this._preFiltersData[i] = undefined;
		}
		while ((i = this._applyFilters.indexOf(method)) > -1) {
			this._applyFilters[i] = undefined;
			this._applyFiltersData[i] = undefined;
		}
		this._preFilters = this._preFilters.clean();
		this._preFiltersData = this._preFiltersData.clean();
		this._applyFilters = this._applyFilters.clean();
		this._applyFiltersData = this._applyFiltersData.clean();
		
		this._rerenderFilters();
	},
	
	/**
	 * Removes all filters on the texture
	 * Useful if you want to keep resizings, etc. 
	 */
	removeFilters: function() {
		this._applyFilters = [];
		this._applyFiltersData = [];
		this._preFilters = [];
		this._preFiltersData = [];
		
		this._rerenderFilters();
	},
	
	/**
	 * Rerenders image with filter list. Keeps sizings.
	 * Useful if you have no preFilters
	 */
	_rerenderFilters: function() {
		if (!this._textureCanvas) return;
		// Rerender applyFilters from scratch:
		// Draw the basic image
		// resize it to the old boundaries
		this.resize(this._textureCanvas.width, this._textureCanvas.height, false);
		// Draw applyFilter layers upon it
		var self = this;
		this._applyFilters.forEach(function(method, index) {
			self._textureCtx.save();
			method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._applyFiltersData[index]);
			self._textureCtx.restore();
		});
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

					// Set smoothing mode
					if (!this._smoothing) {
						this._textureCtx.imageSmoothingEnabled = false;
						this._textureCtx.webkitImageSmoothingEnabled = false;
						this._textureCtx.mozImageSmoothingEnabled = false;
					} else {
						this._textureCtx.imageSmoothingEnabled = true;
						this._textureCtx.webkitImageSmoothingEnabled = true;
						this._textureCtx.mozImageSmoothingEnabled = true;
					}
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;

				// Save filter in active preFilter list
				this._preFilters[this._preFilters.length] = method;
				this._preFiltersData[this._preFiltersData.length] = !data ? {} : data;
			}
			return this;
		} else {
			this.log('Cannot use pre-filter, no filter method was passed!', 'warning');
		}

		return this._preFilters[this._preFilters.length - 1];
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
		if (this._loaded) {
			if (method !== undefined) {
				if (this._originalImage) {
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
	
						this._textureCanvas.width = this._originalImage.width;
						this._textureCanvas.height = this._originalImage.height;
						this._textureCtx = this._textureCanvas.getContext('2d');
						
						// Draw the basic image
						this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
						this._textureCtx.drawImage(this._originalImage, 0, 0);
	
						// Set smoothing mode
						if (!this._smoothing) {
							this._textureCtx.imageSmoothingEnabled = false;
							this._textureCtx.webkitImageSmoothingEnabled = false;
							this._textureCtx.mozImageSmoothingEnabled = false;
						} else {
							this._textureCtx.imageSmoothingEnabled = true;
							this._textureCtx.webkitImageSmoothingEnabled = true;
							this._textureCtx.mozImageSmoothingEnabled = true;
						}
					}
	
					// Swap the current image for this new canvas
					this.image = this._textureCanvas;
	
					// Call the passed method
					if (this._preFilters.length <= 0) {
						this._textureCtx.save();
						method(this._textureCanvas, this._textureCtx, this._originalImage, this, data);
						this._textureCtx.restore();
					}
					
					// Save filter in active applyFiler list
					this._applyFilters[this._applyFilters.length] = method;
					this._applyFiltersData[this._applyFiltersData.length] = !data ? {} : data;
				}
			} else {
				this.log('Cannot apply filter, no filter method was passed!', 'warning');
			}
		} else {
			this.log('Cannot apply filter, the texture you are trying to apply the filter to has not yet loaded!', 'error');
		}

		return this;
	},
	
	/**
	 * Retrieves pixel data from x,y texture coordinate (starts from top-left).
	 * Important: If the texture has a cross-domain url, the image host must allow
	 * cross-origin resource sharing or a security error will be thrown.
	 * Reference: http://blog.chromium.org/2011/07/using-cross-domain-images-in-webgl-and.html
	 * @param  {Number} x
	 * @param  {Number} y
	 * @return {Array} [r,g,b,a] Pixel data.
	 */
	pixelData: function (x, y) {
		if (this._loaded) {
			if (this.image) {
				// Check if the texture is already using a canvas
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');

					this._textureCanvas.width = this.image.width;
					this._textureCanvas.height = this.image.height;
					this._textureCtx = this._textureCanvas.getContext('2d');

					// Set smoothing mode
					if (!this._smoothing) {
						this._textureCtx.imageSmoothingEnabled = false;
						this._textureCtx.webkitImageSmoothingEnabled = false;
						this._textureCtx.mozImageSmoothingEnabled = false;
					} else {
						this._textureCtx.imageSmoothingEnabled = true;
						this._textureCtx.webkitImageSmoothingEnabled = true;
						this._textureCtx.mozImageSmoothingEnabled = true;
					}
					
					// Draw the image to the canvas
					this._textureCtx.drawImage(this.image, 0, 0);
				} else {
					this._textureCtx = this._textureCtx;
				}

				return this._textureCtx.getImageData(x, y, 1, 1).data;
			}
		} else {
			this.log('Cannot read pixel data, the texture you are trying to read data from has not yet loaded!', 'error');
		}

		return this;
	},

	/**
	 * Creates a clone of the texture.
	 * @return {IgeTexture} A new, distinct texture with the same attributes
	 * as the one being cloned.
	 */
	clone: function () {
		return this.textureFromCell(1);
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this._url + "')";

		// Every object has an ID, assign that first
		// We've commented this because ids for textures are actually generated
		// from their asset so will ALWAYS produce the same ID as long as the asset
		// is the same path.
		//str += ".id('" + this.id() + "')";

		// Now get all other properties
		str += this._stringify();

		return str;
	},
	
	_stringify: function () {
		return '';
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }