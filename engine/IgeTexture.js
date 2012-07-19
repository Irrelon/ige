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

	/** url - Loads a file for this texture. Can be a render script
	or an actual image file. {
		category:"method",
		arguments: [{
			type:"string",
			name:"url",
			desc:"The url used to load the file for this texture.",
		}],
	} **/
	url: function (url) {
		this._url = url;

		if (url.substr(url.length - 2, 2) === 'js') {
			// This is a script-based texture, load the script
			this._loadScript(url);
		} else {
			// This is an image-based texture, load the image
			this._loadImage(url);
		}
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

		ige.textureLoadStart();

		if (!ige.isServer) {
			image = this.image = this._originalImage = new Image();
			image._igeTexture = this;
			image.onload = function () {
				self.log('Texture image "' + imageUrl + '" loaded successfully');
				self._mode = 0;
				self.sizeX(image.width);
				self.sizeY(image.height);

				self._cells[1] = [0, 0, self._sizeX, self._sizeY];

				self._loaded = true;
				self.emit('loaded-init');
				self.emit('loaded');
				ige.textureLoadEnd(imageUrl);
			};

			image.src = imageUrl;
		}
		/* CEXCLUDE */
		if (ige.isServer) {
			// Load the asset and get it's details
			this.imageMagic.info(imageUrl, function(err, data){
				if (!err) {
					// Assign the data to the image for later use
					self.log('Texture image "' + imageUrl + '" loaded successfully');
					self.sizeX(data.width);
					self.sizeY(data.height);

					self._cells[1] = [0, 0, self._sizeX, self._sizeY];

					self._loaded = true;
					self.emit('loaded-init');
					self.emit('loaded');
					ige.textureLoadEnd(imageUrl);
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
					self.emit('loaded-init');
					self.emit('loaded');
					ige.textureLoadEnd(scriptUrl);
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
						self.emit('loaded-init');
						self.emit('loaded');
						ige.textureLoadEnd(scriptUrl);
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
				geom = entity.geometry;

			ctx.drawImage(
				this.image,
				cell[0], // texture x
				cell[1], // texture y
				cell[2], // texture width
				cell[3], // texture height
				-(geom.x / 2) + entity._anchor.x, // render x TODO: Performance - Cache these?
				-(geom.y / 2) + entity._anchor.y, // render y
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

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }