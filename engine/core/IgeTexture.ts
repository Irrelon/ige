import IgeBaseClass from "./IgeBaseClass";
import { IgeSmartTexture } from "../../types/IgeSmartTexture";
import WithEventingMixin from "../mixins/IgeEventingMixin";
import { arrPull } from "../services/utils";
import { ige } from "../instance";
import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import IgeImage from "./IgeImage";
import IgeCanvas from "./IgeCanvas";
import IgeEntity from "./IgeEntity";
import WithUiStyleMixin from "../mixins/IgeUiStyleMixin";

type IgeTextureCell = [number, number, number, number, string?];
type IgeTextureCellArray = IgeTextureCell[];

/**
 * Creates a new texture.
 */
class IgeTexture extends WithEventingMixin(WithUiStyleMixin(IgeBaseClass)) {
	classId = "IgeTexture";
	IgeTexture = true;
	_id?: string;
	_didInit = false;
	_sizeX: number = 0;
	_sizeY: number = 0;
	_loaded: boolean = false;
	_smoothing: boolean = false;
	_filterImageDrawn: boolean = false;
	_destroyed: boolean = false;
	_url?: string;
	_applyFilters: IgeSmartFilter[] = []; // TODO: Rename to _postFilters
	_applyFiltersData: Record<string, any>[] = [];
	_preFilters: IgeSmartFilter[] = [];
	_preFiltersData: Record<string, any>[] = [];
	_originalImage?: IgeImage | IgeCanvas;
	_textureCanvas?: IgeCanvas;
	_textureCtx?: CanvasRenderingContext2D;
	_cells: IgeTextureCellArray = [];
	image?: IgeImage | IgeCanvas;
	script?: IgeSmartTexture;

	/**
	 * Constructor for a new IgeTexture.
	 * @param {Ige} ige The engine instance.
	 * @param {string | IgeSmartTexture} urlOrObject Either a string URL that
	 * points to the path of the image or script you wish to use as
	 * the texture image, or an object containing a smart texture.
	 */
	constructor (urlOrObject?: string | IgeSmartTexture) {
		super();
		this._loaded = false;

		/* CEXCLUDE */
		// If on a server, error
		if (ige.isServer) {
			this.log(
				"Cannot create a texture on the server. Textures are only client-side objects. Please alter your code so that you don't try to load a texture on the server-side using something like an if statement around your texture laoding such as \"if (ige.isClient) {}\".",
				"error"
			);
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

		if (!urlOrObject) return;

		if (typeof urlOrObject === "string") {
			// Load the texture URL
			if (urlOrObject) {
				this.url(urlOrObject);
			}
		} else {
			// Assign the texture script object
			this.assignSmartTextureImage(urlOrObject);
		}
	}

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id (id: string): this;
	id (): string;
	id (id?: string) {
		if (id !== undefined) {
			// Check if this ID already exists in the object register
			if (ige._register[id]) {
				if (ige._register[id] === this) {
					// We are already registered as this id
					return this;
				}

				// Already an object with this ID!
				this.log("Cannot set ID of object to \"" + id + "\" because that ID is already in use by another object!", "error");
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
	}

	/**
	 * Gets / sets the source file for this texture.
	 * @param {String=} url "The url used to load the file for this texture.
	 * @return {*}
	 */
	url (url: string): this;
	url (): string | undefined;
	url (url?: string) {
		if (url !== undefined) {
			this._url = url;

			if (url.substr(url.length - 2, 2) === "js") {
				// This is a script-based texture, load the script
				this._loadScript(url);
			} else {
				// This is an image-based texture, load the image
				this._loadImage(url);
			}

			return this;
		}

		return this._url;
	}

	/**
	 * Loads an image into an img tag and sets an onload event
	 * to capture when the image has finished loading.
	 * @param {String} imageUrl The image url used to load the
	 * image data.
	 * @private
	 */
	_loadImage (imageUrl: string) {
		if (!ige.isClient) {
			return;
		}

		ige.textureLoadStart(imageUrl, this);

		if (!ige._textureImageStore[imageUrl]) {
			// Image not in cache, create the image object
			const image = ige._textureImageStore[imageUrl] = this.image = this._originalImage = new IgeImage();
			image._igeTextures = image._igeTextures || [];

			// Add this texture to the textures that are using this image
			image._igeTextures.push(this);

			image.onload = () => {
				// Mark the image as loaded
				image._loaded = true;

				// Log success
				ige.log("Texture image (" + imageUrl + ") loaded successfully");

				/*if (image.width % 2) {
					self.log('The texture ' + imageUrl + ' width (' + image.width + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture width is divisible by 2!', 'warning');
				}

				if (image.height % 2) {
					self.log('The texture ' + imageUrl + ' height (' + image.height + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture height is divisible by 2!', 'warning');
				}*/

				// Loop textures that are using this image
				const arr = image._igeTextures;
				const arrCount = arr.length;

				for (let i = 0; i < arrCount; i++) {
					const item = arr[i];

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
			const image = this.image = this._originalImage = ige._textureImageStore[imageUrl];

			// Add this texture to the textures that are using this image
			image._igeTextures.push(this);

			if (image._loaded) {
				// The cached image object is already loaded so
				// fire off the relevant events
				this._mode = 0;

				this.sizeX(image.width);
				this.sizeY(image.height);

				if (image.width % 2) {
					this.log(
						"This texture's width is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: " +
						this._url,
						"warning"
					);
				}

				if (image.height % 2) {
					this.log(
						"This texture's height is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: " +
						this._url,
						"warning"
					);
				}

				this._cells[1] = [0, 0, this._sizeX, this._sizeY];

				// Mark texture as loaded
				this._textureLoaded();
			}
		}
	}

	_textureLoaded () {
		// Set a timeout here so that when this event is emitted,
		// the code creating the texture is given a chance to
		// set a listener first, otherwise this will be emitted
		// but nothing will have time to register a listener!
		setTimeout(() => {
			this._loaded = true;
			this.emit("loaded");

			// Inform the engine that this image has loaded
			ige.textureLoadEnd((this.image as IgeImage).src, this);
		}, 5);
	}

	/**
	 * Loads a render script into a script tag and sets an onload
	 * event to capture when the script has finished loading.
	 * @param {String} scriptUrl The script url used to load the
	 * script data.
	 * @private
	 */
	_loadScript (scriptUrl: string) {
		const textures = ige._textureStore;
		let rs_sandboxContext,
			scriptElem;

		ige.textureLoadStart(scriptUrl, this);

		if (ige.isClient) {
			import(scriptUrl)
				.then((module) => {
					console.log("Loaded module", module);
				})
				.catch((err) => {
					console.log("Module error", err);
				});

			// TODO: Finish this off so we can dynamically load script-based
			//		render functions and store the imported module as a Smart Texture
			// scriptElem = document.createElement("script");
			// scriptElem.onload = function (data) {
			// 	self.log("Texture script \"" + scriptUrl + "\" loaded successfully");
			// 	// Parse the JS with evil eval and store the result in the asset
			// 	eval(data);
			//
			// 	// Store the eval data (the "image" variable is declared
			// 	// by the texture script and becomes available in this scope
			// 	// because we evaluated it above)
			// 	self._mode = 1;
			// 	self.script = image;
			//
			// 	// Run the asset script init method
			// 	if (typeof(image.init) === "function") {
			// 		image.init.apply(image, [self]);
			// 	}
			//
			// 	//self.sizeX(image.width);
			// 	//self.sizeY(image.height);
			//
			// 	self._loaded = true;
			// 	self.emit("loaded");
			// 	ige.textureLoadEnd(scriptUrl, self);
			// };
			//
			// scriptElem.addEventListener("error", () => {
			// 	self.log("Error loading smart texture script file: " + scriptUrl, "error");
			// }, true);
			//
			// scriptElem.src = scriptUrl;
			// document.getElementsByTagName("head")[0].appendChild(scriptElem);
		}
	}

	/**
	 * Assigns a render script to the smart texture.
	 * @param {String} scriptObj The script object.
	 * @private
	 */
	assignSmartTextureImage (scriptObj: IgeSmartTexture) {
		// Check the object has a render method
		if (typeof scriptObj.render !== "function") {
			throw new Error("Cannot assign smart texture because it doesn't have a render() method!");
		}

		// Store the script data
		this._mode = 1;
		this.script = scriptObj;

		// Run the asset script init method
		if (typeof scriptObj.init === "function") {
			scriptObj.init.apply(scriptObj, [this]);
		}

		this._loaded = true;
		this.emit("loaded");
	}

	/**
	 * Sets the image element that the IgeTexture will use when
	 * rendering. This is a special method not designed to be called
	 * directly by any game code and is used specifically when
	 * assigning an existing canvas element to an IgeTexture.
	 * @param {IgeImage} imageElement The canvas / image to use as
	 * the image data for the IgeTexture.
	 * @private
	 */
	_setImage (imageElement: IgeImage | IgeCanvas) {
		let image;

		if (ige.isClient) {
			// Create the image object
			image = this.image = this._originalImage = imageElement;

			// Mark the image as loaded
			image._loaded = true;

			this._mode = 0;

			this.sizeX(image.width);
			this.sizeY(image.height);

			this._cells[1] = [0, 0, this._sizeX, this._sizeY];
		}
	}

	/**
	 * Sets the _sizeX property.
	 * @param {Number} val
	 */
	sizeX (val: number) {
		this._sizeX = val;
	}

	/**
	 * Sets the _sizeY property.
	 * @param {Number} val
	 */
	sizeY (val: number) {
		this._sizeY = val;
	}

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
	resize (x: number, y: number, dontDraw = false) {
		if (this._originalImage) {
			if (!this._loaded) {
				throw new Error(`Cannot resize texture because the texture image (${this._url}) has not loaded into memory yet!`);
			}

			if (!this._textureCtx || !this._textureCanvas) {
				// Create a new canvas
				this._textureCanvas = new IgeCanvas();
			}

			this._textureCanvas.width = x;
			this._textureCanvas.height = y;
			const tmpCtx = this._textureCanvas.getContext("2d");

			if (!tmpCtx) {
				throw new Error("Couldn't get texture canvas 2d context!");
			}

			this._textureCtx = tmpCtx;

			// Set smoothing mode
			this._textureCtx.imageSmoothingEnabled = this._smoothing;

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
	}

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
	resizeByPercent (x: number, y: number, dontDraw = false) {
		if (!this._originalImage) {
			return;
		}

		if (!this._loaded) {
			throw new Error(`Cannot resize texture because the texture image (${this._url}) has not loaded into memory yet!`);
		}

		// Calc final x/y values
		x = Math.floor((this._originalImage.width / 100) * x);
		y = Math.floor((this._originalImage.height / 100) * y);

		if (!this._textureCtx || !this._textureCanvas) {
			// Create a new canvas
			this._textureCanvas = new IgeCanvas();
		}

		this._textureCanvas.width = x;
		this._textureCanvas.height = y;
		const tmpCtx = this._textureCanvas.getContext("2d");

		if (!tmpCtx) {
			throw new Error("Couldn't get texture canvas 2d context!");
		}

		this._textureCtx = tmpCtx;

		// Set smoothing mode
		this._textureCtx.imageSmoothingEnabled = this._smoothing;

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

	/**
	 * Sets the texture image back to the original image that the
	 * texture first loaded. Useful if you have applied filters
	 * or resized the image and now want to revert to the original.
	 */
	restoreOriginal () {
		this.image = this._originalImage;
		delete this._textureCtx;
		delete this._textureCanvas;

		this.removeFilters();
	}

	smoothing (val?: boolean) {
		if (val !== undefined) {
			this._smoothing = val;
			return this;
		}

		return this._smoothing;
	}

	/**
	 * Renders the texture image to the passed canvas context.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to draw to.
	 * @param {IgeEntity} entity The entity that this texture is
	 * being drawn for.
	 */
	render (ctx: CanvasRenderingContext2D, entity: IgeEntity) {
		// Check that the cell is not set to null. If it is then
		// we don't render anything which effectively makes the
		// entity "blank"
		if (entity._cell === null) {
			return;
		}

		if (ige._ctx) {
			ige._ctx.imageSmoothingEnabled = this._smoothing;
		}

		if (this._mode === 0) {
			// This texture is image-based
			if (!this._originalImage || !this.image) {
				throw new Error("No image is available to render but the IgeTexture is in mode zero (image based render)!");
			}

			const cell = this._cells[entity._cell],
				geom = entity._bounds2d,
				poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method

			if (!cell) {
				throw new Error(`Cannot render texture using cell ${entity._cell} because the cell does not exist in the assigned texture!`);
			}

			if (this._preFilters.length > 0 && this._textureCanvas && this._textureCtx) {
				// Call the drawing of the original image
				this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
				this._textureCtx.drawImage(this._originalImage, 0, 0);

				// Call the applyFilter and preFilter methods one by one
				this._applyFilters.forEach((method, index) => {
					if (!this._textureCanvas || !this._textureCtx || !this._originalImage) return;
					this._textureCtx.save();
					method(this._textureCanvas, this._textureCtx, this._originalImage, this, this._applyFiltersData[index]);
					this._textureCtx.restore();
				});
				this._preFilters.forEach((method, index) => {
					if (!this._textureCanvas || !this._textureCtx || !this._originalImage) return;
					this._textureCtx.save();
					method(this._textureCanvas, this._textureCtx, this._originalImage, this, this._preFiltersData[index]);
					this._textureCtx.restore();
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
		}

		if (this._mode === 1) {
			if (!this.script) {
				throw new Error("No smart texture is available to render but the IgeTexture is in mode one (script based render)!");
			}

			// This texture is script-based (a "smart texture")
			ctx.save();
			this.script.render(ige, ctx, entity, this);
			ctx.restore();

			ige._drawCount++;
		}
	}

	/**
	 * Removes a certain filter from the texture
	 * Useful if you want to keep resizings, etc.
	 */
	removeFilter (method: IgeSmartFilter) {
		// TODO: Maybe we should refactor filter data structures so that the filter data is stored alongside the filter method?
		const matchingPreFilterIndexes: number[] = [];
		const matchingApplyFilterIndexes: number[] = [];

		// Find any filter methods that match the passed `method`
		this._preFilters.forEach((tmpFilterItem: IgeSmartFilter, index: number) => {
			if (tmpFilterItem === method) {
				matchingPreFilterIndexes.push(index);
			}
		});

		this._applyFilters.forEach((tmpFilterItem: IgeSmartFilter, index: number) => {
			if (tmpFilterItem === method) {
				matchingApplyFilterIndexes.push(index);
			}
		});

		// Remove any filter methods that match the passed `method`
		for (let i = matchingPreFilterIndexes.length - 1; i >= 0; i--) {
			const index = matchingPreFilterIndexes[i];
			this._preFilters.splice(index, 1);
			this._preFiltersData.splice(index, 1);
		}

		for (let i = matchingApplyFilterIndexes.length - 1; i >= 0; i--) {
			const index = matchingApplyFilterIndexes[i];
			this._applyFilters.splice(index, 1);
			this._applyFiltersData.splice(index, 1);
		}

		this._rerenderFilters();
	}

	/**
	 * Removes all filters on the texture
	 * Useful if you want to keep resizings, etc.
	 */
	removeFilters () {
		this._applyFilters = [];
		this._applyFiltersData = [];
		this._preFilters = [];
		this._preFiltersData = [];

		this._rerenderFilters();
	}

	/**
	 * Rerenders image with filter list. Keeps sizings.
	 * Useful if you have no preFilters
	 */
	_rerenderFilters () {
		if (!this._textureCanvas) return;
		// Rerender applyFilters from scratch:
		// Draw the basic image
		// resize it to the old boundaries
		this.resize(this._textureCanvas.width, this._textureCanvas.height, false);
		// Draw applyFilter layers upon it
		this._applyFilters.forEach((method, index) => {
			if (!this._textureCtx || !this._textureCanvas || !this._originalImage) return;
			this._textureCtx.save();
			method(this._textureCanvas, this._textureCtx, this._originalImage, this, this._applyFiltersData[index]);
			this._textureCtx.restore();
		});
	}

	/**
	 * Gets / sets the pre-filter method that will be called before
	 * the texture is rendered and will allow you to modify the texture
	 * image before rendering each tick.
	 * @param method
	 * @param data
	 * @return {*}
	 */
	preFilter (method: IgeSmartFilter, data?: any) {
		if (!this._originalImage) {
			return this;
		}

		if (!this._textureCtx || !this._textureCanvas) {
			// Create a new canvas
			this._textureCanvas = new IgeCanvas();

			this._textureCanvas.width = this._originalImage.width;
			this._textureCanvas.height = this._originalImage.height;
			const tmpCtx = this._textureCanvas.getContext("2d");

			if (!tmpCtx) {
				throw new Error("Couldn't get texture canvas 2d context!");
			}

			this._textureCtx = tmpCtx;

			// Set smoothing mode
			this._textureCtx.imageSmoothingEnabled = this._smoothing;
		}

		// Swap the current image for this new canvas
		this.image = this._textureCanvas;

		// Save filter in active preFilter list
		this._preFilters[this._preFilters.length] = method;
		this._preFiltersData[this._preFiltersData.length] = !data ? {} : data;

		return this;
	}

	/**
	 * Applies a filter to the texture. The filter is a method that will
	 * take the canvas, context and originalImage parameters and then
	 * use context calls to alter / paint the context with the texture
	 * and any filter / adjustments that you want to apply.
	 * @param {Function} method
	 * @param {Object=} data
	 * @return {*}
	 */
	applyFilter (method: IgeSmartFilter, data?: any) {
		if (!this._loaded) {
			throw new Error("Cannot apply filter, the texture you are trying to apply the filter to has not yet loaded!");
		}

		if (!this._originalImage) {
			return this;
		}

		if (!this._textureCtx || !this._textureCanvas) {
			// Create a new canvas
			this._textureCanvas = new IgeCanvas();

			this._textureCanvas.width = this._originalImage.width;
			this._textureCanvas.height = this._originalImage.height;
			const tmpCtx = this._textureCanvas.getContext("2d");

			if (!tmpCtx) {
				throw new Error("Couldn't get texture canvas 2d context!");
			}

			this._textureCtx = tmpCtx;

			// Draw the basic image
			this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
			this._textureCtx.drawImage(this._originalImage, 0, 0);

			// Set smoothing mode
			this._textureCtx.imageSmoothingEnabled = this._smoothing;
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

		return this;
	}

	/**
	 * Retrieves pixel data from x,y texture coordinate (starts from top-left).
	 * Important: If the texture has a cross-domain url, the image host must allow
	 * cross-origin resource sharing or a security error will be thrown.
	 * Reference: http://blog.chromium.org/2011/07/using-cross-domain-images-in-webgl-and.html
	 * @param  {Number} x
	 * @param  {Number} y
	 * @return {Array} [r,g,b,a] Pixel data.
	 */
	pixelData (x: number, y: number) {
		if (!this._loaded) {
			throw new Error("Cannot read pixel data, the texture you are trying to read data from has not yet loaded!");
		}

		if (!this.image) {
			return this;
		}

		// Check if the texture is already using a canvas
		if (!this._textureCtx || !this._textureCanvas) {
			// Create a new canvas
			this._textureCanvas = new IgeCanvas();

			this._textureCanvas.width = this.image.width;
			this._textureCanvas.height = this.image.height;
			const tmpCtx = this._textureCanvas.getContext("2d");

			if (!tmpCtx) {
				throw new Error("Couldn't get texture canvas 2d context!");
			}

			this._textureCtx = tmpCtx;

			// Set smoothing mode
			this._textureCtx.imageSmoothingEnabled = this._smoothing;

			// Draw the image to the canvas
			this._textureCtx.drawImage(this.image, 0, 0);
		}

		return this._textureCtx.getImageData(x, y, 1, 1).data;
	}

	/**
	 * Creates a clone of the texture.
	 * @return {IgeTexture} A new, distinct texture with the same attributes
	 * as the one being cloned.
	 */
	clone () {
		return this.textureFromCell(1);
	}

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify () {
		let str = "new " + this.classId + "('" + this._url + "')";

		// Every object has an ID, assign that first
		// We've commented this because ids for textures are actually generated
		// from their asset so will ALWAYS produce the same ID as long as the asset
		// is the same path.
		//str += ".id('" + this.id() + "')";

		// Now get all other properties
		str += this._stringify();

		return str;
	}

	/**
	 * Creates a new texture from a cell in the existing texture
	 * and returns the new texture.
	 * @param {number | string} indexOrId The cell index or id to use.
	 * @return {*}
	 */
	textureFromCell (indexOrId: number | string) {
		const tex = new IgeTexture();

		if (this._loaded) {
			this._textureFromCell(tex, indexOrId);
		} else {
			// The texture has not yet loaded, return the new texture and set a listener to handle
			// when this texture has loaded then we can assign the texture's image properly
			this.on("loaded", () => {
				this._textureFromCell(tex, indexOrId);
			});
		}

		return tex;
	}

	/**
	 * Called by textureFromCell() when the texture is ready
	 * to be processed. See textureFromCell() for description.
	 * @param {IgeTexture} tex The new texture to paint to.
	 * @param {Number, String} indexOrId The cell index or id
	 * to use.
	 * @private
	 */
	_textureFromCell (tex: IgeTexture, indexOrId: number | string) {
		if (!this._originalImage) {
			throw new Error("Unable to create new texture from passed cell index because we don't have an _originalImage assigned to the IgeTexture!");
		}

		let index;

		if (typeof indexOrId === "string") {
			// TODO: cellIdToIndex is part of the IgeSpriteSheet class
			//   so this call is incorrect here, fix the whole process
			index = this.cellIdToIndex(indexOrId);
		} else {
			index = indexOrId;
		}

		if (!this._cells[index]) {
			throw new Error(`Unable to create new texture from passed cell index (${indexOrId}) because the cell does not exist!`);
		}

		// Create a new IgeTexture, then draw the existing cell
		// to its internal canvas
		const cell = this._cells[index];
		const canvas = new IgeCanvas();
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Unable to get 2d context from IgeTexture canvas");
		}

		// Set smoothing mode
		// TODO: Does this cause a costly context change? If so maybe we set a global value to keep
		//    track of the value and evaluate first before changing?
		ctx.imageSmoothingEnabled = this._smoothing;

		canvas.width = cell[2];
		canvas.height = cell[3];

		// Draw the cell to the canvas
		ctx.drawImage(this._originalImage, cell[0], cell[1], cell[2], cell[3], 0, 0, cell[2], cell[3]);

		// Set the new texture's image to the canvas
		// TODO: We need to figure out how to create a uniform interface for using either
		//		an image or a canvas source for texture image data
		tex._setImage(canvas);
		tex._loaded = true;

		// Fire the loaded event
		setTimeout(() => {
			tex.emit("loaded");
		}, 1);
	}

	/**
	 * Returns the cell index that the passed cell id corresponds
	 * to.
	 * @param {String} id
	 * @return {Number} The cell index that the cell id corresponds
	 * to or -1 if a corresponding index could not be found.
	 */
	cellIdToIndex (id: string) {
		const cells = this._cells;

		for (let i = 1; i < cells.length; i++) {
			if (cells[i][4] === id) {
				// Found the cell id so return the index
				return i;
			}
		}

		return -1;
	}

	_stringify () {
		return "";
	}

	/**
	 * Destroys the item.
	 */
	destroy () {
		delete this._eventListeners;

		// Remove us from the image store reference array
		if (this.image && this.image._igeTextures) {
			arrPull(this.image._igeTextures, this);
		}

		// Remove the texture from the texture store
		arrPull(ige._textureStore, this);

		delete this.image;
		delete this.script;
		delete this._textureCanvas;
		delete this._textureCtx;

		this._destroyed = true;
	}
}

export default IgeTexture;
