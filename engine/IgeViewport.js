var IgeViewport = IgeUiEntity.extend([
	{extension: IgeUiPositionExtension}
], {
	classId: 'IgeViewport',

	init: function (options) {
		this._super();

		// Set default options if not specified
		if (options === undefined) {
			options = {
				left: 0,
				top: 0,
				width: ige.geometry.x,
				height: ige.geometry.y,
				autoSize: true
			};
		}

		// Setup default objects
		this.geometry = new IgePoint(options.width || 250, options.height || 150, 0);
		this.camera = new IgeCamera(this);

		// Move the viewport into position
		if (options.left !== undefined) {
			this.left(options.left);
		}

		if (options.center !== undefined) {
			this.center(options.center);
		}

		if (options.right !== undefined) {
			this.right(options.right);
		}

		if (options.top !== undefined) {
			this.top(options.top);
		}

		if (options.middle !== undefined) {
			this.middle(options.middle);
		}

		if (options.bottom !== undefined) {
			this.bottom(options.bottom);
		}

		// Set autoSize flag
		this.autoSize(options.autoSize);

		// Set the border style
		this.borderStyle(options.borderStyle);
	},

	/**
	 * Gets / sets the border style for the viewport.
	 * @param {String} val
	 * @return {*}
	 */
	borderStyle: function (val) {
		if (val !== undefined) {
			this._border = val;
			ige.clearCanvas();
			return this;
		}

		return this._border;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the viewport will
	 * automatically resize to fill the entire scene.
	 * @param val
	 * @return {*}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	/**
	 * Gets / sets the scene that the viewport will render.
	 * @param {IgeScene2d, IgeSceneIso} scene
	 * @return {*}
	 */
	scene: function (scene) {
		if (typeof(scene) !== 'undefined') {
			this._scene = scene;
			return this;
		}

		return this._scene;
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, scene) {
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;

			var thisTranslate = this._translate,
				thisRotate = this._rotate,
				thisScale = this._scale,
				thisOrigin = this._origin,
				thisGeometry = this.geometry,
				camTransform = this.camera,
				camX = camTransform._translate.x,
				camY = camTransform._translate.y;

			// Transform the context to the center of the viewport
			ctx.translate(
				thisTranslate.x + ((thisGeometry.x * thisOrigin.x) | 0),
				thisTranslate.y + ((thisGeometry.y * thisOrigin.y) | 0)
			);
			ctx.rotate(thisRotate.z);
			ctx.scale(thisScale.x, thisScale.y);

			// Translate back to the top-left of the viewport
			ctx.translate(-(thisGeometry.x * thisOrigin.x) | 0, -(thisGeometry.y * thisOrigin.y) | 0);

			ctx.clearRect(
				0,
				0,
				thisGeometry.x,
				thisGeometry.y
			);

			// Clip the context so we only draw "inside" the viewport area
			ctx.beginPath();
				ctx.rect(
					0,
					0,
					thisGeometry.x,
					thisGeometry.y
				);

				// Paint a border if required
				if (this._border) {
					ctx.strokeStyle = this._border;
					ctx.stroke();
				}
			ctx.clip();

			// Transform the context to the center of the viewport
			ctx.translate(
				(((thisGeometry.x * camTransform._origin.x) | 0) - camX | 0),
				(((thisGeometry.y * camTransform._origin.y) | 0) - camY | 0)
			); // Bitwise floor
			ctx.rotate(camTransform._rotate.z);
			ctx.scale(camTransform._scale.x, camTransform._scale.y);

			// Render our scene data
			this._scene.tick(ctx, scene);

			if (1 || this._drawAllBounds) {
				// Traverse the scenegraph and draw axis-aligned
				// bounding boxes for every object
				this.drawAABBs(ctx, this._scene);
			}

			// Process the tick method up the class chain
			this._super(ctx);
		}
	},

	drawAABBs: function (ctx, rootObject) {
		var arr = rootObject._children,
			arrCount,
			obj,
			aabb;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				obj = arr[arrCount];

				if (typeof(obj.aabb) === 'function') {
					// Grab the AABB and then draw it
					aabb = obj.aabb();

					if (aabb) {
						ctx.strokeStyle = '#ffffff';
						ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);

						this.drawAABBs(ctx, obj);
					}
				}
			}
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (this._autoSize) {
			this.geometry.x = ige.geometry.x;
			this.geometry.x2 = (this.geometry.x / 2);
			this.geometry.y = ige.geometry.y;
			this.geometry.y2 = (this.geometry.y / 2);
		}

		this._updateUiPosition();

		// Resize the scene
		if (this._scene) {
			this._scene._resizeEvent(event);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeViewport; }