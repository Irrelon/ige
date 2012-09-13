/**
 * Creates a new entity.
 */
var IgeEntity = IgeObject.extend([
	{extension: IgeTransformExtension, overwrite: false},
	{extension: IgeUiInteractionExtension, overwrite: true},
	{extension: IgeStreamExtension, overwrite: false},
	{extension: IgeInterpolatorExtension, overwrite: true}
], {
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._width = undefined;
		this._height = undefined;

		this._anchor = {x: 0, y: 0};
		this._renderPos = {x: 0, y: 0};

		this._opacity = 1;
		this._cell = 1;

		this._deathTime = undefined;

		this._oldTranslate = new IgePoint(0, 0, 0);
		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

		this.geometry = new IgePoint(40, 40, 40);

		this._highlight = false;
		this._mouseEventsActive = false;

        this._localMatrix = new IgeMatrix2d(this);
        this._worldMatrix = new IgeMatrix2d(this);

		// Set the stream floating point precision to 2 as default
		this.streamFloatPrecision(2);

		// Set the default stream sections as just the transform data
		this.streamSections(['transform']);
	},

	/**
	 * Returns the position of the mouse relative to this entity.
	 * @return {*}
	 */
	mousePos: function () {
		var parentMousePos;

		// Get the parent mouse position
		if (this._parent) {
			if (this._parent.mousePos) {
				parentMousePos = this._parent.mousePos();

				// Transform the parent mouse position to the current local position
				//return this._localMatrix.transformCoord({x: parentMousePos.x, y: parentMousePos.y});
				return new IgePoint(parentMousePos.x - this._translate.x, parentMousePos.y - this._translate.y, 0);
			} else {
				// This path should not ever be reached! Every parent object
				// should have a mousePos() method or inherit one!
				throw('What happened? This code path should never be reached!');
			}
		} else {
			return {x: 0, y: 0};
		}
	},

	/**
	 * Translates the object to the tile co-ordinates passed.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	translateToTile: function (x, y, z) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var finalZ;

			// Handle being passed a z co-ordinate
			if (z !== undefined) {
				finalZ = z * this._parent._tileWidth;
			} else {
				finalZ = this._translate.z;
			}

			this.translateTo(x * this._parent._tileWidth, y * this._parent._tileHeight, finalZ);
		} else {
			this.log('Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Set the object's width to the number of tile width's specified.
	 * @param {Number} val
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new width.
	 * @private
	 */
	widthByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2,
				ratio;

			this.width(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the height based on the new width
					ratio = this._texture._sizeX / this.geometry.x;
					this.height(this._texture._sizeY / ratio);
				} else {
					this.log('Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!', 'error');
				}
			}
		} else {
			this.log('Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Set the object's height to the number of tile height's specified.
	 * @param val
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new height.
	 * @private
	 */
	heightByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2,
				ratio;

			this.height(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the width based on the new height
					ratio = this._texture._sizeY / this.geometry.y;
					this.width(this._texture._sizeX / ratio);
				} else {
					this.log('Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!', 'error');
				}
			}
		} else {
			this.log('Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile map.
	 */
	occupyTile: function () {
		this.log('Cannot occupy a tile because the entity is not currently mounted to a tile sheet.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile map.
	 */
	overTiles: function () {
		this.log('Cannot determine which tiles this entity lies over because the entity is not currently mounted to a tile sheet.', 'warning');
	},

	/**
	 * Gets / sets the anchor position that this entity's texture
	 * will be adjusted by.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	anchor: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._anchor = {x: x, y: y};
			return this;
		}

		return this._anchor;
	},

	/**
	 * Gets / sets the geometry.x.
	 * @param {Number=} px
	 * @return {*}
	 */
	width: function (px) {
		if (px !== undefined) {
			this._width = px;
			this.geometry.x = px;
			this.geometry.x2 = (px / 2);
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry.y.
	 * @param {Number=} px
	 * @return {*}
	 */
	height: function (px) {
		if (px !== undefined) {
			this._height = px;
			this.geometry.y = px;
			this.geometry.y2 = (px / 2);
			return this;
		}

		return this._height;
	},

	/**
	 * Gets / sets the 3d geometry of the entity. The x and y values are
	 * relative to the center of the entity and the z value is wholly
	 * positive.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	size3d: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this.geometry = new IgePoint(x, y, z);
			return this;
		}

		return this.geometry;
	},

	/**
	 * Gets / sets the life span of the object in milliseconds. The life
	 * span is how long the object will exist for before being automatically
	 * destroyed.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	lifeSpan: function (val) {
		if (val !== undefined) {
			this.deathTime(new Date().getTime() + val);
			return this;
		}

		return this.deathTime() - new Date().getTime();
	},

	/**
	 * Gets / sets the timestamp in milliseconds that denotes the time
	 * that the entity will be destroyed. The object checks it's own death
	 * time during each tick and if the current time is greater than the
	 * death time, the object will be destroyed.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	deathTime: function (val) {
		if (val !== undefined) {
			this._deathTime = val;
			return this;
		}

		return this._deathTime;
	},

	/**
	 * Gets / sets the entity opacity from 0.0 to 1.0.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	opacity: function (val) {
		if (val !== undefined) {
			this._opacity = val;
			return this;
		}

		return this._opacity;
	},

	/**
	 * Gets / sets the texture to use when rendering the entity.
	 * @param {IgeTexture=} texture
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	texture: function (texture) {
		if (texture !== undefined) {
			this._texture = texture;
			return this;
		}

		return this._texture;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	cell: function (val) {
		if (val > 0) {
			this._cell = val;
			return this;
		}

		return this._cell;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture.
	 */
	dimensionsFromTexture: function () {
		if (this._texture) {
			this.width(this._texture._sizeX);
			this.height(this._texture._sizeY);
		}

		return this;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture cell. If the texture is not cell-based
	 * the entire texture width / height will be used.
	 */
	dimensionsFromCell: function () {
		if (this._texture) {
			this.width(this._texture._cells[this._cell][2]);
			this.height(this._texture._cells[this._cell][3]);
		}

		return this;
	},

	/**
	 * Gets / sets the highlight mode. True is on false is off.
	 * @param {Boolean} val
	 * @return {*}
	 */
	highlight: function (val) {
		if (val !== undefined) {
			this._highlight = val;
			return this;
		}

		return this._highlight;
	},

	/**
	 * Converts an array of points from local space to this entity's
	 * world space using it's world transform matrix.
	 * @param points
	 */
	localToWorld: function (points) {
		this._worldMatrix.transform(points);
	},

	/**
	 * Calculates and returns the current axis-aligned bounding box.
	 * @return {Object} An object with the properties: x, y, width, height
	 */
	aabb: function (recalc) {
		if (recalc || !this._aabb) {
			var poly = new IgePoly2d(),
				minX, minY,
				maxX, maxY,
				box = {},
				anc = this._anchor,
				geom = this.geometry,
				geomX = geom.x,
				geomY = geom.y,
				geomZ = geom.z,
				geomX2 = geom.x2,
				geomY2 = geom.y2,
				geomZ2 = geom.z2,
				origin = this._origin,
				originX = origin.x - 0.5,
				originY = origin.y - 0.5,
				originZ = origin.z - 0.5,
				x, y,
				ox,	oy,
				tf1;

			// Handle 2d entities
			if (this._mode === 0) {
				x = geomX2 + anc.x;
				y = geomY2 + anc.y;
				ox = geomX * originX;
				oy = geomY * originY;

				poly.addPoint(-x + ox, -y + oy);
				poly.addPoint(x + ox, -y + oy);
				poly.addPoint(x + ox, y + oy);
				poly.addPoint(-x + ox, y + oy);

				this._renderPos = {x: -x + ox, y: -y + oy};

				// Convert the poly's points from local space to world space
				this.localToWorld(poly._poly);

				// Get the extents of the newly transformed poly
				minX = Math.min(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				minY = Math.min(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				maxX = Math.max(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				maxY = Math.max(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				box.x = minX;
				box.y = minY;
				box.width = maxX - minX;
				box.height = maxY - minY;
			}

			// Handle isometric entities
			if (this._mode === 1) {
				// Top face
				tf1 = new IgePoint(-(geom.x / 2), -(geom.y / 2),  (geom.z / 2)).toIso();

				x = (tf1.x + geom.x) + anc.x;
				y = tf1.y + anc.y;
				ox = geomX * originX;
				oy = geomZ * originZ;

				poly.addPoint(-x + ox, -y + oy);
				poly.addPoint(x + ox, -y + oy);
				poly.addPoint(x + ox, y + oy);
				poly.addPoint(-x + ox, y + oy);

				this._renderPos = {x: -x + ox, y: -y + oy};

				// Convert the poly's points from local space to world space
				this.localToWorld(poly._poly);

				// Get the extents of the newly transformed poly
				minX = Math.min(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				minY = Math.min(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				maxX = Math.max(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				maxY = Math.max(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				box.x = minX;
				box.y = minY;
				box.width = maxX - minX;
				box.height = maxY - minY;
			}

			this._aabb = box;

			return box;
		} else {
			return this._aabb;
		}
	},

	_swapVars: function (x, y) {
		return [y, x];
	},

	_internalsOverlap: function (x0, x1, y0, y1) {
		var tempSwap;

		if (x0 > x1) {
			tempSwap = this._swapVars(x0, x1);
			x0 = tempSwap[0];
			x1 = tempSwap[1];
		}

		if (y0 > y1) {
			tempSwap = this._swapVars(y0, y1);
			y0 = tempSwap[0];
			y1 = tempSwap[1];
		}

		if (x0 > y0) {
			tempSwap = this._swapVars(x0, y0);
			x0 = tempSwap[0];
			y0 = tempSwap[1];

			tempSwap = this._swapVars(x1, y1);
			x1 = tempSwap[0];
			y1 = tempSwap[1];
		}

		return y0 < x1;
	},

	_projectionOverlap: function (otherObject) {
		var thisG3d = this.geometry,
			thisMin = new IgePoint(
				this._translate.x - thisG3d.x / 2,
				this._translate.y - thisG3d.y / 2,
				this._translate.z - thisG3d.z
			),
			thisMax = new IgePoint(
				this._translate.x + thisG3d.x / 2,
				this._translate.y + thisG3d.y / 2,
				this._translate.z + thisG3d.z
			),
			otherG3d = otherObject.geometry,
			otherMin = new IgePoint(
				otherObject._translate.x - otherG3d.x / 2,
				otherObject._translate.y - otherG3d.y / 2,
				otherObject._translate.z - otherG3d.z
			),
			otherMax = new IgePoint(
				otherObject._translate.x + otherG3d.x / 2,
				otherObject._translate.y + otherG3d.y / 2,
				otherObject._translate.z + otherG3d.z
			);

		return this._internalsOverlap(
			thisMin.x - thisMax.y,
			thisMax.x - thisMin.y,
			otherMin.x - otherMax.y,
			otherMax.x - otherMin.y
		) && this._internalsOverlap(
			thisMin.x - thisMax.z,
			thisMax.x - thisMin.z,
			otherMin.x - otherMax.z,
			otherMax.x - otherMin.z
		) && this._internalsOverlap(
			thisMin.z - thisMax.y,
			thisMax.z - thisMin.y,
			otherMin.z - otherMax.y,
			otherMax.z - otherMin.y
		);
	},

	_isBehind: function (otherObject) {
		var thisG3d = this.geometry,
			thisMin = new IgePoint(
				this._translate.x - thisG3d.x / 2,
				this._translate.y - thisG3d.y / 2,
				this._translate.z
			),
			thisMax = new IgePoint(
				this._translate.x + thisG3d.x / 2,
				this._translate.y + thisG3d.y / 2,
				this._translate.z + thisG3d.z
			),
			otherG3d = otherObject.geometry,
			otherMin = new IgePoint(
				otherObject._translate.x - otherG3d.x / 2,
				otherObject._translate.y - otherG3d.y / 2,
				otherObject._translate.z
			),
			otherMax = new IgePoint(
				otherObject._translate.x + otherG3d.x / 2,
				otherObject._translate.y + otherG3d.y / 2,
				otherObject._translate.z + otherG3d.z
			);

		if (thisMax.x <= otherMin.x) {
			return false;
		}

		if (otherMax.x <= thisMin.x) {
			return true;
		}

		if (thisMax.y <= otherMin.y) {
			return false;
		}

		if (otherMax.y <= thisMin.y) {
			return true;
		}

		if (thisMax.z <= otherMin.z) {
			return false;
		}

		if (otherMax.z <= thisMin.z) {
			return true;
		}
		console.log('ERROR WITH IS BEHIND!');
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param {HTMLCanvasContext} ctx
	 * @private
	 */
	_transformContext: function (ctx) {
		// Check for changes to the transform values
		// directly without calling the transform methods
		this.updateTransform();

		// Update the aabb
		this.aabb(true); // TODO: This is wasteful, find a way to determine if a recalc is required rather than doing it every tick

		if (this._parent) {
			// TODO: Does this only work one level deep? we need to alter a _worldOpacity property down the chain
			ctx.globalAlpha = this._parent._opacity * this._opacity;
		} else {
			ctx.globalAlpha = this._opacity;
		}

		this._localMatrix.transformRenderingContext(ctx);
	},

	/**
	 * Transforms a point by the entity's parent world matrix and
	 * it's own local matrix transforming the point to this entity's
	 * world space.
	 * @param igePoint
	 * @private
	 */
	_transformPoint: function (igePoint) {
		if (this._parent) {
			var tempMat = new IgeMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.transformCoord(igePoint);
		} else {
			this._localMatrix.transformCoord(igePoint);
		}

		return igePoint;
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {HTMLCanvasContext} ctx
	 * @param {Boolean} dontTransform If set to true, the tick method will
	 * not transform the context based on the entity's matrices. This is useful
	 * if you have extended the class and want to process down the inheritance
	 * chain but have already transformed the entity in a previous overloaded
	 * method.
	 */
	tick: function (ctx, dontTransform) {
		// Check if the entity should still exist
		if (this._deathTime !== undefined && this._deathTime <= ige.tickStart) {
			// The entity should be removed because it has died
			this.destroy();
		} else {
			// Remove the stream data cache
			delete this._streamDataCache;

			// Process any behaviours assigned to the entity
			this._processBehaviours(ctx);

			// Process any interpolation
			this._processInterpolate(ige.tickStart - ige.network.stream._renderLatency);

			// Process any mouse events we need to do
			var texture = this._texture,
				mp, aabb, mouseX, mouseY,
				self = this;

			if (this._mouseEventsActive) {
				mp = ige._currentViewport._mousePos;

				if (mp) {
					aabb = this.aabb();
					mouseX = mp.x;
					mouseY = mp.y;

					// Check if the current mouse position is inside this aabb
					if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
						// Point is inside the aabb
						ige.input.queueEvent(this, this._mouseInAabb);
					} else {
						if (ige.input.mouseMove) {
							// There is a mouse move event
							self._handleMouseOut(ige.input.mouseMove);
						}
					}
				}
			}

			// Transform the context by the current transform settings
			if (!dontTransform) {
				this._transformContext(ctx);
			}

			// Check if the entity is visible based upon its opacity
			if (this._opacity > 0 && texture) {
				// Draw the entity image
				texture.render(ctx, this, ige.tickDelta);

				if (this._highlight) {
					ctx.globalCompositeOperation = 'lighter';
					texture.render(ctx, this);
				}
			}

			// Process any automatic-mode stream updating required
			if (this._streamMode === 1) {
				this.streamSync();
			}

			// Process children
			this._super(ctx);

			// Update all the old values to current values
			this._oldTranslate = this._translate.clone();
		}
	},

	/**
	 * Checks mouse input types and fires the correct mouse event
	 * handler.
	 * @param evc
	 * @private
	 */
	_mouseInAabb: function (evc) {
		if (ige.input.mouseMove) {
			// There is a mouse move event
			this._handleMouseIn(ige.input.mouseMove, evc);
		}

		if (ige.input.mouseDown) {
			// There is a mouse down event
			this._handleMouseDown(ige.input.mouseDown, evc);
		}

		if (ige.input.mouseUp) {
			// There is a mouse up event
			this._handleMouseUp(ige.input.mouseUp, evc);
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
		var str = this._super(), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_opacity':
						str += ".opacity(" + this.opacity() + ")";
						break;
					case '_texture':
						str += ".texture(ige.$('" + this.texture().id() + "'))";
						break;
					case '_cell':
						str += ".cell(" + this.cell() + ")";
						break;
					case '_translate':
						str += ".translateTo(" + this._translate.x + ", " + this._translate.y + ", " + this._translate.z + ")";
						break;
					case '_rotate':
						str += ".rotateTo(" + this._rotate.x + ", " + this._rotate.y + ", " + this._rotate.z + ")";
						break;
					case '_scale':
						str += ".scaleTo(" + this._scale.x + ", " + this._scale.y + ", " + this._scale.z + ")";
						break;
					case '_origin':
						str += ".originTo(" + this._origin.x + ", " + this._origin.y + ", " + this._origin.z + ")";
						break;
					case '_anchor':
						str += ".anchor(" + this._anchor.x + ", " + this._anchor.y + ")";
						break;
					case '_width':
						if (typeof(this.width()) === 'string') {
							str += ".width('" + this.width() + "')";
						} else {
							str += ".width(" + this.width() + ")";
						}
						break;
					case '_height':
						if (typeof(this.height()) === 'string') {
							str += ".height('" + this.height() + "')";
						} else {
							str += ".height(" + this.height() + ")";
						}
						break;
					case 'geometry':
						str += ".size3d(" + this.geometry.x + ", " + this.geometry.y + ", " + this.geometry.z + ")";
						break;
					case '_deathTime':
						str += ".deathTime('" + this.deathTime() + "')";
						break;
					case '_highlight':
						str += ".highlight('" + this.highlight() + "')";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; }