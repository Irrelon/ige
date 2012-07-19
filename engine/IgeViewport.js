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
		this.camera._entity = this;
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
			ige._currentViewport = this;

			// Render our scene data
			//ctx.globalAlpha = ctx.globalAlpha * this._parent._opacity * this._opacity;
			this._super(ctx);

			// Translate to the top-left of the viewport
			ctx.translate(
				-(this.geometry.x * this._origin.x) | 0,
				-(this.geometry.y * this._origin.y) | 0
			);

			// Clear the rectangle area of the viewport
			ctx.clearRect(0, 0, this.geometry.x, this.geometry.y);

			// Clip the context so we only draw "inside" the viewport area
			ctx.beginPath();
				ctx.rect(0, 0, this.geometry.x, this.geometry.y);

				// Paint a border if required
				if (this._borderColor) {
					ctx.strokeStyle = this._borderColor;
					ctx.stroke();
				}
			ctx.clip();

			ctx.translate((this.geometry.x / 2) | 0, (this.geometry.y / 2) | 0);

			// Transform the context to the center of the viewport
			ctx.translate(
				-this.camera._translate.x,
				-this.camera._translate.y
			); // Bitwise floor
			ctx.rotate(this.camera._rotate.z);
			ctx.scale(this.camera._scale.x, this.camera._scale.y);

			this._scene.tick(ctx, scene);

			if (this._drawBounds && ctx === ige._ctx) {
				ctx.fillStyle = '#fc00ff';
				ctx.fillRect(ige._mousePos.x - 5, ige._mousePos.y - 5, 10, 10);

				// Traverse the scenegraph and draw axis-aligned
				// bounding boxes for every object
				this.drawAABBs(ctx, this._scene, 0);
			}
		}
	},

	drawAABBs: function (ctx, rootObject, index) {
		var arr = rootObject._children,
			arrCount,
			obj,
			aabb;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				obj = arr[arrCount];
				index++;

				if (obj._shouldRender !== false) {
					if (typeof(obj.aabb) === 'function') {
						// Grab the AABB and then draw it
						aabb = obj.aabb();

						if (aabb) {
							ctx.strokeStyle = '#00deff';
							if (obj._drawBounds || obj._drawBounds === undefined) {
								ctx.strokeStyle = '#00deff';
								ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);
							}

							if (this._drawBoundsData  && (obj._drawBounds || obj._drawBoundsData === undefined)) {
								ctx.globalAlpha = 0.5;
								ctx.fillStyle = '#8a00ff';
								ctx.fillRect(aabb.x, aabb.y, aabb.width, 14);
								ctx.globalAlpha = 1;
								ctx.fillStyle = '#f6ff00';
								ctx.fillText('[' + obj.id() + '] ' + index, aabb.x + 3, aabb.y + 10);
							}
						}
					}

					this.drawAABBs(ctx, obj, index);
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