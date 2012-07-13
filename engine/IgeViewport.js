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
		this.camera = new IgeTransform(this);

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
			var thisTransform = this.transform,
				thisTranslate = thisTransform._translate,
				thisRotate = thisTransform._rotate,
				thisScale = thisTransform._scale,
				thisOrigin = thisTransform._origin,
				thisGeometry = this.geometry,
				camTransform = this.camera,
				camX = camTransform._translate.x,
				camY = camTransform._translate.y;

			// Transform the context to the center of the viewport
			ctx.translate(
				thisTranslate.x + (
					thisGeometry.x * thisOrigin.x
				),
				thisTranslate.y + (
					thisGeometry.y * thisOrigin.y
				)
			);
			ctx.rotate(thisRotate.z);
			ctx.scale(thisScale.x, thisScale.y);

			// Translate back to the top-left of the viewport
			//ctx.translate(-(thisGeometry.x * thisOrigin.x), -(thisGeometry.y * thisOrigin.y));

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
				((thisGeometry.x * camTransform._origin.x) - camX | 0),
				((thisGeometry.y * camTransform._origin.y) - camY | 0)
			); // Bitwise floor
			ctx.rotate(camTransform._rotate.z);
			ctx.scale(camTransform._scale.x, camTransform._scale.y);/**/

			// Render our scene data
			this._scene.tick(ctx, scene);

			// Process the tick method up the class chain
			this._super(ctx, true);
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
			this.geometry.y = ige.geometry.y;
		}

		this._updateUiPosition();

		// Resize the scene
		if (this._scene) {
			this._scene._resizeEvent(event);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeViewport; }