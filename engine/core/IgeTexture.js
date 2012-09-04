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
			this.imageMagic = require(modulePath + 'easyimage');
			this.vm = require('vm');
			this.fs = require('fs');
		}
		/* CEXCLUDE */

		// Create an array that is used to store cell dimensions
		this._cells = [];

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

	/** _loadImage - Loads an image into an img tag and sets an onload event to capture
	when the image has finished loading. {
		category:"method",
		arguments: [{
			type:"string",
			name:"imageUrl",
			desc:"The image url used to load the image data.",
		}],
	} **/
	_loadImage: function (imageUrl) {
		var image,
			self = this;

		if (!ige.isServer) {
			if (!ige._textureImageStore[imageUrl]) {
				ige.textureLoadStart();

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
					}

					// Inform the engine that this image has loaded
					ige.textureLoadEnd(imageUrl, self);
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

					self._cells[1] = [0, 0, self._sizeX, self._sizeY];

					self._loaded = true;

					// Set a timeout here so that when this event is emitted,
					// the code creating the texture is given a chance to
					// set a listener first, otherwise this will be emitted
					// but nothing will have time to register a listener!
					setTimeout(function () {
						self.emit('loaded');
					}, 1);
				}
			}
		}
		/* CEXCLUDE */
		if (ige.isServer) {
			ige.textureLoadStart();

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

	/** _loadScript - Loads a render script into a script tag and sets an
	onload event to capture	when the script has finished loading. {
		category:"method",
		arguments: [{
			type:"string",
			name:"scriptUrl",
			desc:"The script url used to load the script data.",
		}],
	} **/
	_loadScript: function (scriptUrl) {
		var textures = ige.textures,
			rs_sandboxContext,
			self = this;

		ige.textureLoadStart(scriptUrl);

		if (!ige.isServer) {
			$.ajax({
				url: scriptUrl,
				success: this.bind(function(data) {
					this.log('Texture script "' + scriptUrl + '" loaded successfully');
					// Parse the JS with evil eval and store the result in the asset
					eval(data);

					// Store the eval data (the "image" variable is declared
					// by the texture script and becomes availabe in this scope
					// because we eval'd above)
					this._mode = 1;
					this.script = image;

					// Run the asset script init method
					if (typeof(image.init) === 'function') {
						image.init.apply(image, [ige, self]);
					}

					this.sizeX(image.width);
					this.sizeY(image.height);

					this._loaded = true;
					self.emit('loaded');
					ige.textureLoadEnd(scriptUrl, self);
				}),
				dataType: 'script'
			});
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

	sizeX: function (val) {
		this._sizeX = val;
	},

	sizeY: function (val) {
		this._sizeY = val;
	},

	resize: function (x, y) {
		if (this._originalImage) {
			// Create a new canvas
			var newCanvas = document.createElement('canvas'),
				ctx;

			newCanvas.width = x;
			newCanvas.height = y;
			ctx = newCanvas.getContext('2d');

			// Draw the original image to the new canvas
			// scaled as required
			ctx.drawImage(
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

			// Swap the current image for this new canvas
			this.image = newCanvas;
		}
	},

	restoreOriginal: function () {
		this.image = this._originalImage;
	},

	render: function (ctx, entity, tickDelta) {
		if (this._mode === 0) {
			// This texture is image-based
			var cell = this._cells[entity._cell],
				geom = entity.geometry,
				poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method

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
		}

		if (this.mode === 1) {
			// This texture is script-based (a "smart texture")
			ctx.save();
				this.script.render(ctx, entity, tickDelta);
			ctx.restore();

			ige._drawCount++;
		}
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

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }