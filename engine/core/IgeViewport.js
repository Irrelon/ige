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
		var width, height;
		
		this._alwaysInView = true;
		IgeEntity.prototype.init.call(this);

		this._mouseAlwaysInside = true;
		this._mousePos = new IgePoint3d(0, 0, 0);
		this._overflow = '';
		this._clipping = true;
		this._bornTime = undefined;

		// Set default options if not specified
		// TODO: Is this required or even used?
		if (options) {
			width = options.width;
			height = options.height;
			
			if (options && options.scaleToWidth && options.scaleToHeight) {
				// Store the w/h we want to lock to
				this._lockDimension = new IgePoint3d(options.scaleToWidth, options.scaleToHeight, 0);
			}
		}

		// Setup default objects
		this._bounds2d = new IgePoint3d(width || ige._bounds2d.x, height || ige._bounds2d.y, 0);
		this.camera = new IgeCamera(this);
		this.camera._entity = this;
		//this._drawMouse = true;
	},

	/**
	 * Sets the minimum amount of world in pixels to display in width and height.
	 * When set, if the viewport's geometry is reduced below the minimum width or
	 * height, the viewport's camera is automatically scaled to ensure that the
	 * minimum area remains visible in the viewport.
	 * @param {Integer} width Width in pixels.
	 * @param {Integer} height Height in pixels.
	 * @returns {*}
	 */
	minimumVisibleArea: function (width, height) {
		// Store the w/h we want to lock to
		this._lockDimension = new IgePoint3d(width, height, 0);
		if (ige.isClient) {
			this._resizeEvent({});
		}
		
		return this;
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
	 * @return {IgePoint3d}
	 */
	mousePos: function () {
		// Viewport mouse position is calculated and assigned in the
		// IgeInputComponent class.
		return this._mousePos.clone();
	},
	
	mousePosWorld: function () {
		return this._transformPoint(this._mousePos.clone());
	},

	/**
	 * Gets the current rectangular area that the viewport is "looking at"
	 * in the world. The co-ordinates are in world space.
	 * @returns {IgeRect}
	 */
	viewArea: function () {
		var aabb = this.aabb(),
			camTrans = this.camera._translate,
			camScale = this.camera._scale,
			width = aabb.width * (1 / camScale.x),
			height = aabb.height * (1 / camScale.y);
		
		return new IgeRect(
			(camTrans.x - width / 2),
			(camTrans.y - height / 2),
			width,
			height
		);
	},

	/**
	 * Processes the updates before the render tick is called.
	 * @param ctx
	 */
	update: function (ctx, tickDelta) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			this.camera.update(ctx, tickDelta);
			IgeEntity.prototype.update.call(this, ctx, tickDelta);
			
			if (this._scene.newFrame()) {
				this._scene.update(ctx, tickDelta);
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
				-(this._bounds2d.x * this._origin.x) | 0,
				-(this._bounds2d.y * this._origin.y) | 0
			);

			// Clear the rectangle area of the viewport
			ctx.clearRect(0, 0, this._bounds2d.x, this._bounds2d.y);

			// Clip the context so we only draw "inside" the viewport area
			if (this._clipping || this._borderColor) {
				ctx.beginPath();
				ctx.rect(0, 0, this._bounds2d.x / ige._scale.x, this._bounds2d.y / ige._scale.x);

				// Paint a border if required
				if (this._borderColor) {
					ctx.strokeStyle = this._borderColor;
					ctx.stroke();
				}
				
				if (this._clipping) {
					ctx.clip();
				}
			}

			// Translate back to the center of the viewport
			ctx.translate(((this._bounds2d.x / 2) | 0) + ige._translate.x, ((this._bounds2d.y / 2) | 0) + ige._translate.y);
			/*ctx.translate(ige._translate.x, ige._translate.y);*/
			if (ige._scale.x !== 1 || ige._scale.y !== 1) {
				ctx.scale(ige._scale.x, ige._scale.y);
			}

			// Transform the context to the center of the viewport
			// by processing the viewport's camera tick method
			this.camera.tick(ctx);

			// Draw the scene
			ctx.save();
				this._scene.tick(ctx);
			ctx.restore();

			// Check if we should draw guides
			if (this._drawGuides && ctx === ige._ctx) {
				ctx.save();
				ctx.translate(-this._translate.x, -this._translate.y);
				this.paintGuides(ctx);
				ctx.restore();
			}
			
			// Check if we should draw bounds on this viewport
			// (usually for debug purposes)
			if (this._drawBounds && ctx === ige._ctx) {
				// Traverse the scenegraph and draw axis-aligned
				// bounding boxes for every object
				ctx.save();
				ctx.translate(-this._translate.x, -this._translate.y);
				this.paintAabbs(ctx, this._scene, 0);
				ctx.restore();
			}

			// Check if we should draw the mouse position on this
			// viewport (usually for debug purposes)
			if (this._drawMouse && ctx === ige._ctx) {
				ctx.save();
				var mp = this.mousePos(),
					text,
					mx,
					my,
					textMeasurement;

				// Re-scale the context to ensure that output is always 1:1
				ctx.scale(1 / this.camera._scale.x, 1 / this.camera._scale.y);

				// Work out the re-scale mouse position
				mx = Math.floor(mp.x * this.camera._scale.x);
				my = Math.floor(mp.y * this.camera._scale.y);

				ctx.fillStyle = '#fc00ff';
				ctx.fillRect(mx - 5, my - 5, 10, 10);

				text = this.id() + ' X: ' + mx + ', Y: ' + my;
				textMeasurement = ctx.measureText(text);
				ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
				ctx.fillRect(Math.floor(mx - textMeasurement.width / 2 - 5), Math.floor(my - 25), Math.floor(textMeasurement.width + 10), 14);
				ctx.fillStyle = '#ffffff';
				ctx.fillText(text, mx - textMeasurement.width / 2, my - 15);
				ctx.restore();
			}
			
			if (this._drawViewArea) {
				ctx.save();
					var va = this.viewArea();
					ctx.rect(va.x, va.y, va.width, va.height);
					ctx.stroke();
				ctx.restore();
			}
		}
	},

	/**
	 * Returns the screen position of the viewport as an IgePoint3d where x is the
	 * "left" and y is the "top", useful for positioning HTML elements at the
	 * screen location of an IGE entity. The returned values indicate the center
	 * of the viewport on the screen.
	 * 
	 * This method assumes that the top-left
	 * of the main canvas element is at 0, 0. If not you can adjust the values
	 * yourself to allow for offset.
	 * @example #Get the screen position of the entity
	 *     var screenPos = entity.screenPosition();
	 * @return {IgePoint3d} The screen position of the entity.
	 */
	screenPosition: function () {
		return new IgePoint3d(
			Math.floor(this._worldMatrix.matrix[2] + ige._bounds2d.x2),
			Math.floor(this._worldMatrix.matrix[5] + ige._bounds2d.y2),
			0
		);
	},
	
	drawViewArea: function (val) {
		if (val !== undefined) {
			this._drawViewArea = val;
			return this;
		}
		
		return this._drawViewArea;
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
	
	drawGuides: function (val) {
		if (val !== undefined) {
			this._drawGuides = val;
			return this;
		}
		
		return this._drawGuides;
	},
	
	paintGuides: function (ctx) {
		var geom = ige._bounds2d;
		
		// Check draw-guides setting
		if (this._drawGuides) {
			ctx.strokeStyle = '#ffffff';
			
			ctx.translate(0.5, 0.5);
			
			// Draw guide lines in the center
			ctx.beginPath();
			ctx.moveTo(0, -geom.y2);
			ctx.lineTo(0, geom.y);
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(-geom.x2, 0);
			ctx.lineTo(geom.x, 0);
			ctx.stroke();
		}
	},

	/**
	 * Draws the bounding data for each entity in the scenegraph.
	 * @param ctx
	 * @param rootObject
	 * @param index
	 */
	paintAabbs: function (ctx, rootObject, index) {
		var arr = rootObject._children,
			arrCount,
			obj,
			aabb,
			aabbC,
			bounds3dPoly,
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
					if (obj._classId !== 'IgeScene2d' && (!this._drawBoundsLimitId && !this._drawBoundsLimitCategory) || ((this._drawBoundsLimitId && (this._drawBoundsLimitId instanceof Array ? this._drawBoundsLimitId.indexOf(obj.id()) > -1 : this._drawBoundsLimitId === obj.id())) || (this._drawBoundsLimitCategory && this._drawBoundsLimitCategory === obj.category()))) {
						if (typeof(obj.aabb) === 'function') {
							// Grab the AABB and then draw it
							aabb = obj.aabb();

							if (this._drawCompositeBounds && obj._compositeCache) {
								aabbC = obj.compositeAabb();
								
								// Draw composite bounds
								ctx.strokeStyle = '#ff0000';
								ctx.strokeRect(aabbC.x, aabbC.y, aabbC.width, aabbC.height);
							}
							
							if (aabb) {
								if (obj._drawBounds || obj._drawBounds === undefined) {
									//if (!obj._parent || (obj._parent && obj._parent._mountMode !== 1)) {
										// Draw a rect around the bounds of the object transformed in world space
										/*ctx.save();
											obj._worldMatrix.transformRenderingContext(ctx);
											ctx.strokeStyle = '#9700ae';
											ctx.strokeRect(-obj._bounds2d.x2, -obj._bounds2d.y2, obj._bounds2d.x, obj._bounds2d.y);
										ctx.restore();*/
										
										// Draw individual bounds
										ctx.strokeStyle = '#00deff';
										ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);
									//}

									// Check if the object is mounted to an isometric mount
									if (obj._parent && obj._parent._mountMode === 1) {
										bounds3dPoly = obj.bounds3dPolygon().aabb();
										ctx.save();
											ctx.strokeStyle = '#0068b8';
											ctx.strokeRect(bounds3dPoly.x, bounds3dPoly.y, bounds3dPoly.width, bounds3dPoly.height);
										ctx.restore();
										
										ctx.save();
											ctx.translate(
												bounds3dPoly.x + bounds3dPoly.width / 2,
												bounds3dPoly.y + bounds3dPoly.height / 2
											);
											//obj._transformContext(ctx);

											// Calculate the 3d bounds data
											r3d = obj._bounds3d;
											xl1 = new IgePoint3d(-(r3d.x / 2), 0, 0).toIso();
											xl2 = new IgePoint3d(+(r3d.x / 2), 0, 0).toIso();
											xl3 = new IgePoint3d(0, -(r3d.y / 2), 0).toIso();
											xl4 = new IgePoint3d(0, +(r3d.y / 2), 0).toIso();
											xl5 = new IgePoint3d(0, 0, -(r3d.z / 2)).toIso();
											xl6 = new IgePoint3d(0, 0, +(r3d.z / 2)).toIso();
											// Bottom face
											bf1 = new IgePoint3d(-(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf2 = new IgePoint3d(+(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf3 = new IgePoint3d(+(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf4 = new IgePoint3d(-(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											// Top face
											tf1 = new IgePoint3d(-(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf2 = new IgePoint3d(+(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf3 = new IgePoint3d(+(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf4 = new IgePoint3d(-(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();

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

											if (obj._highlight) {
												ctx.globalAlpha = 0.9;
											} else {
												ctx.globalAlpha = 0.6;
											}

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

					this.paintAabbs(ctx, obj, index);
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
			this._bounds2d = this._parent._bounds2d.clone();
		}

		this._updateUiPosition();

		// Resize the scene
		if (this._scene) {
			this._scene._resizeEvent(event);
		}
		
		// Process locked dimension scaling
		if (this._lockDimension) {
			// Calculate the new camera scale
			var ratio = 1,
				tmpX,
				tmpY;
			
			if (this._bounds2d.x > this._lockDimension.x && this._bounds2d.y > this._lockDimension.y) {
				// Scale using lowest ratio
				tmpX = this._bounds2d.x / this._lockDimension.x;
				tmpY = this._bounds2d.y / this._lockDimension.y;
				
				ratio = tmpX < tmpY ? tmpX : tmpY;
			} else {
				if (this._bounds2d.x > this._lockDimension.x && this._bounds2d.y < this._lockDimension.y) {
					// Scale out to show height
					ratio = this._bounds2d.y / this._lockDimension.y;
				}
				
				if (this._bounds2d.x < this._lockDimension.x && this._bounds2d.y > this._lockDimension.y) {
					// Scale out to show width
					ratio = this._bounds2d.x / this._lockDimension.x;
				}
				
				if (this._bounds2d.x < this._lockDimension.x && this._bounds2d.y < this._lockDimension.y) {
					// Scale using lowest ratio
					tmpX = this._bounds2d.x / this._lockDimension.x;
					tmpY = this._bounds2d.y / this._lockDimension.y;
					
					ratio = tmpX < tmpY ? tmpX : tmpY;
				}
			}
			
			this.camera.scaleTo(ratio, ratio, ratio);
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