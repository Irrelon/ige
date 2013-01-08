// TODO: Implement the _stringify() method for this class
/**
 * Creates a new viewport.
 */
var IgeViewport = IgeEntity.extend([
	{extension: IgeUiStyleExtension, overwrite: true},
	{extension: IgeUiPositionExtension, overwrite: true}
], {
	classId: 'IgeViewport',
	IgeViewport: true,

	init: function (options) {
		this._alwaysInView = true;
		IgeEntity.prototype.init.call(this);

		this._mouseAlwaysInside = true;
		this._mousePos = new IgePoint(0, 0, 0);
		this._overflow = '';
		this._uiX = 0;
		this._uiY = 0;

		// Set default options if not specified
		// TODO: Is this required or even used?
		if (options === undefined) {
			options = {
				left: 0,
				top: 0,
				width: ige._geometry.x,
				height: ige._geometry.y,
				autoSize: true
			};
		}

		// Setup default objects
		this._geometry = new IgePoint(options.width || 250, options.height || 150, 0);
		this.camera = new IgeCamera(this);
		this.camera._entity = this;
		//this._drawMouse = true;
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
	 * @param {IgeScene2d} scene
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
	 * Returns the viewport's mouse position.
	 * @return {IgePoint}
	 */
	mousePos: function () {
		// Viewport mouse position is calculated and assigned in the
		// IgeInputComponent class.
		return this._mousePos.clone();
	},
	
	mousePosWorld: function () {
		return this._transformPoint(this._mousePos.clone());
	},

	viewArea: function () {
		var aabb = this.aabb(),
			camTrans = this.camera._translate;

		return new IgeRect(aabb.x + camTrans.x, aabb.y + camTrans.y, aabb.width, aabb.height);
	},

	/**
	 * Processes the updates before the render tick is called.
	 * @param ctx
	 */
	update: function (ctx) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			this.camera.update(ctx);
			IgeEntity.prototype.update.call(this, ctx);
			
			if (this._scene.newFrame()) {
				this._scene.update(ctx);
			}
		}
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, scene) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			// Render our scene data
			//ctx.globalAlpha = ctx.globalAlpha * this._parent._opacity * this._opacity;
			IgeEntity.prototype.tick.call(this, ctx);

			// Translate to the top-left of the viewport
			ctx.translate(
				-(this._geometry.x * this._origin.x) | 0,
				-(this._geometry.y * this._origin.y) | 0
			);

			// Clear the rectangle area of the viewport
			ctx.clearRect(0, 0, this._geometry.x, this._geometry.y);

			// Clip the context so we only draw "inside" the viewport area
			ctx.beginPath();
				ctx.rect(0, 0, this._geometry.x, this._geometry.y);

				// Paint a border if required
				if (this._borderColor) {
					ctx.strokeStyle = this._borderColor;
					ctx.stroke();
				}
			ctx.clip();

			// Translate back to the center of the viewport
			ctx.translate((this._geometry.x / 2) | 0, (this._geometry.y / 2) | 0);

			// Transform the context to the center of the viewport
			// by processing the viewport's camera tick method
			this.camera.tick(ctx);

			// Draw the scene
			ctx.save();
				this._scene.tick(ctx);
			ctx.restore();

			// Check if we should draw bounds on this viewport
			// (usually for debug purposes)
			if (this._drawBounds && ctx === ige._ctx) {
				// Traverse the scenegraph and draw axis-aligned
				// bounding boxes for every object
				ctx.save();
				ctx.translate(-this._translate.x, -this._translate.y);
				this.drawAABBs(ctx, this._scene, 0);
				ctx.restore();
			}

			// Check if we should draw the mouse position on this
			// viewport (usually for debug purposes)
			if (this._drawMouse && ctx === ige._ctx) {
				ctx.save();
					var mp = this.mousePos();

					// Re-scale the context to ensure that output is always 1:1
					ctx.scale(1 / this.camera._scale.x, 1 / this.camera._scale.y);

					// Work out the re-scale mouse position
					var mx = Math.floor(mp.x * this.camera._scale.x),
						my = Math.floor(mp.y * this.camera._scale.y),
						textMeasurement;

					ctx.fillStyle = '#fc00ff';
					ctx.fillRect(mx - 5, my - 5, 10, 10);

					textMeasurement = ctx.measureText('Viewport ' + this.id() + ' :: ' + mx + ', ' + my);
					ctx.fillText('Viewport ' + this.id() + ' :: ' + mx + ', ' + my, mx - textMeasurement.width / 2, my - 15);
				ctx.restore();
			}
		}
	},

	drawBoundsLimitId: function (id) {
		if (id !== undefined) {
			this._drawBoundsLimitId = id;
			return this;
		}

		return this._drawBoundsLimitId;
	},

	drawBoundsLimitCategory: function (category) {
		if (category !== undefined) {
			this._drawBoundsLimitCategory = category;
			return this;
		}

		return this._drawBoundsLimitCategory;
	},
	
	drawCompositeBounds: function (val) {
		if (val !== undefined) {
			this._drawCompositeBounds = val;
			return this;
		}
		
		return this._drawCompositeBounds;
	},

	/**
	 * Draws the bounding data for each entity in the scenegraph.
	 * @param ctx
	 * @param rootObject
	 * @param index
	 */
	drawAABBs: function (ctx, rootObject, index) {
		var arr = rootObject._children,
			arrCount,
			obj,
			aabb,
			aabbC,
			ga,
			r3d,
			xl1, xl2, xl3, xl4, xl5, xl6,
			bf1, bf2, bf3, bf4,
			tf1, tf2, tf3, tf4;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				obj = arr[arrCount];
				index++;

				if (obj._shouldRender !== false) {
					if ((!this._drawBoundsLimitId && !this._drawBoundsLimitCategory) || ((this._drawBoundsLimitId && this._drawBoundsLimitId === obj.id()) || (this._drawBoundsLimitCategory && this._drawBoundsLimitCategory === obj.category()))) {
						if (typeof(obj.aabb) === 'function') {
							// Grab the AABB and then draw it
							aabb = obj.aabb();
							aabbC = obj.compositeAabb();

							if (this._drawCompositeBounds && aabbC) {
								// Draw composite bounds
								ctx.strokeStyle = '#ff0000';
								ctx.strokeRect(aabbC.x, aabbC.y, aabbC.width, aabbC.height);
							}
							
							if (aabb) {
								if (obj._drawBounds || obj._drawBounds === undefined) {
									// Draw individual bounds
									ctx.strokeStyle = '#00deff';
									ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);

									// Check if the object is mounted to an isometric mount
									if (obj._parent && obj._parent._mountMode === 1) {
										ctx.save();
											ctx.translate(aabb.x + aabb.width / 2, aabb.y + aabb.height / 2);
											//obj._transformContext(ctx);

											// Calculate the 3d bounds data
											r3d = obj._geometry;
											xl1 = new IgePoint(-(r3d.x / 2), 0, 0).toIso();
											xl2 = new IgePoint(+(r3d.x / 2), 0, 0).toIso();
											xl3 = new IgePoint(0, -(r3d.y / 2), 0).toIso();
											xl4 = new IgePoint(0, +(r3d.y / 2), 0).toIso();
											xl5 = new IgePoint(0, 0, -(r3d.z / 2)).toIso();
											xl6 = new IgePoint(0, 0, +(r3d.z / 2)).toIso();
											// Bottom face
											bf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											// Top face
											tf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();

											ga = ctx.globalAlpha;

											// Axis lines
											ctx.globalAlpha = 1;
											ctx.strokeStyle = '#ff0000';
											ctx.beginPath();
											ctx.moveTo(xl1.x, xl1.y);
											ctx.lineTo(xl2.x, xl2.y);
											ctx.stroke();
											ctx.strokeStyle = '#00ff00';
											ctx.beginPath();
											ctx.moveTo(xl3.x, xl3.y);
											ctx.lineTo(xl4.x, xl4.y);
											ctx.stroke();
											ctx.strokeStyle = '#fffc00';
											ctx.beginPath();
											ctx.moveTo(xl5.x, xl5.y);
											ctx.lineTo(xl6.x, xl6.y);
											ctx.stroke();

											ctx.strokeStyle = '#a200ff';

											ctx.globalAlpha = 0.6;

											// Left face
											ctx.fillStyle = '#545454';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf4.x, bf4.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();

											// Right face
											ctx.fillStyle = '#282828';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf2.x, bf2.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();

											// Top face
											ctx.fillStyle = '#676767';
											ctx.beginPath();
											ctx.moveTo(tf1.x, tf1.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf1.x, tf1.y);
											ctx.fill();
											ctx.stroke();

											ctx.globalAlpha = ga;
										ctx.restore();
									}
								}

								if (this._drawBoundsData  && (obj._drawBounds || obj._drawBoundsData === undefined)) {
									ctx.globalAlpha = 1;
									ctx.fillStyle = '#f6ff00';
									ctx.fillText('ID: ' + obj.id() + ' ' + '(' + obj.classId() + ') ' + obj.layer() + ':' + obj.depth().toFixed(0), aabb.x + aabb.width + 3, aabb.y + 10);
									ctx.fillText('X: ' + obj._translate.x.toFixed(2) + ', ' + 'Y: ' + obj._translate.y.toFixed(2) + ', ' + 'Z: ' + obj._translate.z.toFixed(2), aabb.x + aabb.width + 3, aabb.y + 20);
									ctx.fillText('Num Children: ' + obj._children.length, aabb.x + aabb.width + 3, aabb.y + 40);
								}
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
		if (this._autoSize && this._parent) {
			this._geometry = this._parent._geometry.clone();
		}

		this._updateUiPosition();

		// Resize the scene
		if (this._scene) {
			this._scene._resizeEvent(event);
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = IgeEntity.prototype._stringify.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_autoSize':
						str += ".autoSize(" + this._autoSize + ")";
						break;
					case '_scene':
						str += ".scene(ige.$('" + this.scene().id() + "'))";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeViewport; }