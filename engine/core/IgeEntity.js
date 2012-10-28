/**
 * Creates a new entity.
 */
var IgeEntity = IgeObject.extend([
	{extension: IgeTransformExtension, overwrite: false},
	{extension: IgeUiInteractionExtension, overwrite: true}
], {
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._width = undefined;
		this._height = undefined;

		this._anchor = new IgePoint(0, 0, 0);
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

		this._inView = true;

		/* CEXCLUDE */
		if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
			// Set the stream floating point precision to 2 as default
			this.streamFloatPrecision(2);

			// Set the default stream sections as just the transform data
			this.streamSections(['transform']);
		}
		/* CEXCLUDE */


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
			return new IgePoint(0, 0, 0);
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
			this._anchor = new IgePoint(x, y, 0);
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
	 * @param {Number=} milliseconds
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	lifeSpan: function (milliseconds) {
		if (milliseconds !== undefined) {
			this.deathTime(new Date().getTime() + milliseconds);
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
				box = new IgeRect(0, 0, 0, 0),
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
		// TODO: Potentially caching the IgePoints here unless this.geometry has changed may speed things up somewhat
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

	/**
	 * Compares the current entity's 3d bounds to the
	 * passed entity and determines if the current entity
	 * is "behind" the passed one. If an entity is behind
	 * another, it is drawn first during the scenegraph
	 * render phase.
	 * @param {IgeEntity} otherObject
	 * @return {Boolean}
	 */
	isBehind: function (otherObject) {
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

		// Entity's are overlapping, calc based on x+y+z
		return ((this._translate.x + this._translate.y + this._translate.z) > (otherObject._translate.x + otherObject._translate.y + otherObject._translate.z));
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

			if (this._timeStream.length) {
				// Process any interpolation
				this._processInterpolate(ige.tickStart - ige.network.stream._renderLatency);
			}

			if (this._inView && (!this._parent || (this._parent._inView))) {
				// Process any mouse events we need to do
				var renderMode = ige._renderMode,
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

				// Render the entity
				this._renderEntity(ctx, dontTransform);

				// Process any automatic-mode stream updating required
				if (this._streamMode === 1) {
					this.streamSync();
				}
			}

			// Process children
			this._super(ctx);

			// Update all the old values to current values
			this._oldTranslate = this._translate.clone();
		}
	},

	_renderEntity: function (ctx, dontTransform) {
		var texture = this._texture;

		// Check if the entity is visible based upon its opacity
		if (this._opacity > 0 && texture) {
			// Draw the entity image
			texture.render(ctx, this, ige.tickDelta);

			if (this._highlight) {
				ctx.globalCompositeOperation = 'lighter';
				texture.render(ctx, this);
			}
		}
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
	},

	destroy: function () {
		this._alive = false;
		this.emit('destroyed', this);

		/* CEXCLUDE */
		// Check if the entity is streaming
		if (this._streamMode === 1) {
			delete this._streamDataCache;
			this.streamSync();
		}
		/* CEXCLUDE */

		// Call IgeObject.destroy()
		this._super();
	},

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// STREAM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/* CEXCLUDE */
	/**
	 * Gets / sets the stream mode that the stream system will use when
	 * handling pushing data updates to connected clients.
	 * @param {Number=} val A value representing the stream mode.
	 * @return {*}
	 */
	streamMode: function (val) {
		if (val !== undefined) {
			this._streamMode = val;
			return this;
		}

		return this._streamMode;
	},

	/**
	 * Gets / sets the stream control callback function that will be called
	 * each time the entity tick method is called and stream-able data is
	 * updated.
	 * @param {Function=} method
	 * @return {*}
	 */
	streamControl: function (method) {
		if (method !== undefined) {
			this._streamControl = method;
			return this;
		}

		return this._streamControl;
	},

	/**
	 * Gets / sets the stream control call interval. This value
	 * is in milliseconds and cannot be lower than 16.
	 * @param {Number=} val Number of milliseconds between calls
	 * to the streamControl method.
	 * @return {*}
	 */
	streamControlInterval: function (val) {
		if (method !== undefined) {
			if (val < 16) {
				delete this._streamControlInterval;
			} else {
				this._streamControlDelta = 0;
				this._streamControlInterval = val;
			}
			return this;
		}

		return this._streamControlInterval;
	},

	/**
	 * Gets / sets the precision by which floating-point values will
	 * be encoded and sent when packaged into stream data.
	 * @param val
	 * @return {*}
	 */
	streamFloatPrecision: function (val) {
		if (val !== undefined) {
			this._streamFloatPrecision = val;

			var i, floatRemove = '\\.';

			// Update the floatRemove regular expression pattern
			for (i = 0; i < this._streamFloatPrecision; i++) {
				floatRemove += '0';
			}

			// Add the trailing comma
			floatRemove += ',';

			// Create the new regexp
			this._floatRemoveRegExp = new RegExp(floatRemove, 'g');

			return this;
		}

		return this._streamFloatPrecision;
	},

	/**
	 * Queues stream data for this entity to be sent to the specified client id or array
	 * of client ids.
	 * @param {String, Array} clientId Either a string ID or an array of string IDs of
	 * each client to send the stream data to.
	 * @return {*}
	 */
	streamSync: function (clientId) {
		if (this._streamMode === 1) {
			// Stream mode is automatic so check for the
			// control method
			if (this._streamControl) {
				// Check if we have a stream control interval
				if (this._streamControlInterval) {
					this._streamControlDelta += ige.tickDelta;

					if (this._streamControlDelta < this._streamControlInterval) {
						// The stream control interval is still higher than
						// the stream control delta so exit without calling the
						// stream control method
						return this;
					} else {
						// We've reached the delta we want so zero it now
						// ready for the next loop
						this._streamControlDelta = 0;
					}
				}
				// Stream control method exists, loop clients and call
				// the control method to see if data should be streamed

				// Grab an array of connected clients from the network
				// system
				var clientArr = ige.network.clients(),
					i;

				for (i in clientArr) {
					if (clientArr.hasOwnProperty(i)) {
						// Call the callback method and if it returns true,
						// send the stream data to this client
						if (this._streamControl.apply(this, [i])) {
							this._streamSync(i);
						}
					}
				}

				return this;
			} else {
				// Stream control method does not exist, send data
				// to all connected clients now
				this._streamSync();
				return this;
			}
		}

		if (this._streamMode === 2) {
			// Stream mode is advanced
			this._streamSync(clientId);

			return this;
		}

		return this;
	},

	/**
	 * Gets / sets the array of sections that this entity will
	 * encode into its stream data.
	 * @param {Array=} sectionArray An array of strings.
	 * @return {*}
	 */
	streamSections: function (sectionArray) {
		if (sectionArray !== undefined) {
			this._streamSections = sectionArray;
			return this;
		}

		return this._streamSections;
	},

	/**
	 * Gets / sets the data for the specified data section id.
	 * @param {String} sectionId A string identifying the section to handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent from the server to the client for this entity.
	 * @param {Boolean=} bypassTimeStream If true, will assign transform directly to entity instead of adding the values to the time stream.
	 * @return {*}
	 */
	streamSectionData: function (sectionId, data, bypassTimeStream) {
		if (sectionId === 'transform') {
			if (data) {
				// We have received updated data
				var dataArr = data.split(',');

				if (!bypassTimeStream) {
					// Translate
					if (dataArr[0]) { dataArr[0] = parseFloat(dataArr[0]); }
					if (dataArr[1]) { dataArr[1] = parseFloat(dataArr[1]); }
					if (dataArr[2]) { dataArr[2] = parseFloat(dataArr[2]); }

					// Scale
					if (dataArr[3]) { dataArr[3] = parseFloat(dataArr[3]); }
					if (dataArr[4]) { dataArr[4] = parseFloat(dataArr[4]); }
					if (dataArr[5]) { dataArr[5] = parseFloat(dataArr[5]); }

					// Rotate
					if (dataArr[6]) { dataArr[6] = parseFloat(dataArr[6]); }
					if (dataArr[7]) { dataArr[7] = parseFloat(dataArr[7]); }
					if (dataArr[8]) { dataArr[8] = parseFloat(dataArr[8]); }

					// Add it to the time stream
					this._timeStream.push([ige.network.stream._streamDataTime + ige.network._latency, dataArr]);

					// Check stream length, don't allow higher than 10 items
					if (this._timeStream.length > 10) {
						// Remove the first item
						this._timeStream.shift();
					}
				} else {
					// Assign all the transform values immediately
					if (dataArr[0]) { this._translate.x = parseFloat(dataArr[0]); }
					if (dataArr[1]) { this._translate.y = parseFloat(dataArr[1]); }
					if (dataArr[2]) { this._translate.z = parseFloat(dataArr[2]); }

					// Scale
					if (dataArr[3]) { this._scale.x = parseFloat(dataArr[3]); }
					if (dataArr[4]) { this._scale.y = parseFloat(dataArr[4]); }
					if (dataArr[5]) { this._scale.z = parseFloat(dataArr[5]); }

					// Rotate
					if (dataArr[6]) { this._rotate.x = parseFloat(dataArr[6]); }
					if (dataArr[7]) { this._rotate.y = parseFloat(dataArr[7]); }
					if (dataArr[8]) { this._rotate.z = parseFloat(dataArr[8]); }
				}
			} else {
				// We should return stringified data
				return this._translate.toString(this._streamFloatPrecision) + ',' + // translate
					this._scale.toString(this._streamFloatPrecision) + ',' + // scale
					this._rotate.toString(this._streamFloatPrecision) + ','; // rotate
			}
		}
	},

	/**
	 * Asks the stream system to queue the stream data to
	 * the specified client id or array of ids.
	 * @param clientId
	 * @private
	 */
	_streamSync: function (clientId) {
		ige.network.stream.queue(this.id(), this._streamData(), clientId);
	},

	/**
	 * Generates and returns the current stream data for this entity. The
	 * data will usually include only properties that have changed since
	 * the last time the stream data was generated. The returned data is
	 * a string that has been compressed in various ways to reduce network
	 * overhead during transmission.
	 * @return {String}
	 * @private
	 */
	_streamData: function () {
		// Check if we already have a cached version of the streamData
		if (this._streamDataCache) {
			return this._streamDataCache;
		} else {
			// Let's generate our stream data
			var streamData = '',
				sectionDataString = '',
				sectionArr = this._streamSections,
				sectionCount = sectionArr.length,
				sectionData,
				sectionIndex,
				aliveInt = this._alive ? 1: 0;

			// Add the default data (id and class)
			streamData += this.id() + ',' + this._parent.id() + ',' + this.classId() + ',' + aliveInt;

			// Only send further data if the entity is still "alive"
			if (this._alive) {
				// Now loop the data sections array and compile the rest of the
				// data string from the data section return data
				for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
					// Get the section data for this section id
					sectionData = this.streamSectionData(sectionArr[sectionIndex]);

					// Add the section start designator character. We do this
					// regardless of if there is actually any section data because
					// we want to be able to identify sections in a serial fashion
					// on receipt of the data string on the client
					sectionDataString += '|';

					// Check if we were returned any data
					if (sectionData) {
						// Add the data to the section string
						sectionDataString += sectionData;
					}
				}

				// Add any custom data to the stream string at this point
				if (sectionDataString) {
					streamData += sectionDataString;
				}

				// Remove any .00 from the string since we don't need that data
				// TODO: What about if a property is a string with something.00 and it should be kept?
				streamData = streamData.replace(this._floatRemoveRegExp, ',');
			}

			// Store the data in cache in case we are asked for it again this tick
			// the tick() method of the IgeEntity class clears this every tick
			this._streamDataCache = streamData;

			return streamData;
		}
	},
	/* CEXCLUDE */

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERPOLATOR
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Calculates the current value based on the time along the
	 * value range.
	 * @param startValue The value that the interpolation started from.
	 * @param endValue The target value to be interpolated to.
	 * @param startTime The time the interpolation started.
	 * @param currentTime The current time.
	 * @param endTime The time the interpolation will end.
	 * @return {Number}
	 */
	interpolateValue: function (startValue, endValue, startTime, currentTime, endTime) {
		var totalValue = endValue - startValue,
			dataDelta = endTime - startTime,
			offsetDelta = currentTime - startTime,
			deltaTime = offsetDelta / dataDelta;

		// Clamp the current time from 0 to 1
		if (deltaTime < 0) { deltaTime = 0; } else if (deltaTime > 1) { deltaTime = 1; }

		return (totalValue * deltaTime) + startValue;
	},

	_processInterpolate: function (renderTime, maxLerp) {
		// Set the maximum lerp to 200 if none is present
		if (!maxLerp) { maxLerp = 200; }

		var maxLerpSquared = maxLerp * maxLerp,
			previousData,
			nextData,
			timeStream = this._timeStream,
			dataDelta,
			offsetDelta,
			currentTime,
			previousTransform,
			nextTransform,
			currentTransform = [],
			i = 1;

		// Find the point in the time stream that is
		// closest to the render time and assign the
		// previous and next data points
		while (timeStream[i]) {
			if (timeStream[i][0] >= renderTime) {
				// We have previous and next data points from the
				// time stream so store them
				previousData = timeStream[i - 1];
				nextData = timeStream[i];
				break;
			}
			i++;
		}

		// Check if we have some data to use
		if (!nextData && !previousData) {
			// No in-time data was found, check for lagging data
			if (timeStream.length > 2) {
				if (timeStream[timeStream.length - 1][0] < renderTime) {
					// Lagging data is available, use that
					previousData = timeStream[timeStream.length - 2];
					nextData = timeStream[timeStream.length - 1];
					timeStream.shift();
					this.emit('entityInterpolationLag');
				}
			}
		} else {
			// We have some new data so clear the old data
			timeStream.splice(0, i - 1);
		}

		// If we have data to use
		if (nextData && previousData) {
			// Calculate the delta times
			dataDelta = nextData[0] - previousData[0];
			offsetDelta = renderTime - previousData[0];

			// Calculate the current time between the two data points
			currentTime = offsetDelta / dataDelta;

			// Clamp the current time from 0 to 1
			if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }

			// Set variables up to store the previous and next data
			previousTransform = previousData[1];
			nextTransform = nextData[1];

			// Translate
			currentTransform[0] = this.interpolateValue(previousTransform[0], nextTransform[0], previousData[0], renderTime, nextData[0]);
			currentTransform[1] = this.interpolateValue(previousTransform[1], nextTransform[1], previousData[0], renderTime, nextData[0]);
			currentTransform[2] = this.interpolateValue(previousTransform[2], nextTransform[2], previousData[0], renderTime, nextData[0]);
			// Scale
			currentTransform[3] = this.interpolateValue(previousTransform[3], nextTransform[3], previousData[0], renderTime, nextData[0]);
			currentTransform[4] = this.interpolateValue(previousTransform[4], nextTransform[4], previousData[0], renderTime, nextData[0]);
			currentTransform[5] = this.interpolateValue(previousTransform[5], nextTransform[5], previousData[0], renderTime, nextData[0]);
			// Rotate
			currentTransform[6] = this.interpolateValue(previousTransform[6], nextTransform[6], previousData[0], renderTime, nextData[0]);
			currentTransform[7] = this.interpolateValue(previousTransform[7], nextTransform[7], previousData[0], renderTime, nextData[0]);
			currentTransform[8] = this.interpolateValue(previousTransform[8], nextTransform[8], previousData[0], renderTime, nextData[0]);

			this.translateTo(parseFloat(currentTransform[0]), parseFloat(currentTransform[1]), parseFloat(currentTransform[2]));
			this.scaleTo(parseFloat(currentTransform[3]), parseFloat(currentTransform[4]), parseFloat(currentTransform[5]));
			this.rotateTo(parseFloat(currentTransform[6]), parseFloat(currentTransform[7]), parseFloat(currentTransform[8]));

			/*// Calculate the squared distance between the previous point and next point
			 dist = this.distanceSquared(previousTransform.x, previousTransform.y, nextTransform.x, nextTransform.y);

			 // Check that the distance is not higher than the maximum lerp and if higher,
			 // set the current time to 1 to snap to the next position immediately
			 if (dist > maxLerpSquared) { currentTime = 1; }

			 // Interpolate the entity position by multiplying the Delta times T, and adding the previous position
			 currentPosition = {};
			 currentPosition.x = ( (nextTransform.x - previousTransform.x) * currentTime ) + previousTransform.x;
			 currentPosition.y = ( (nextTransform.y - previousTransform.y) * currentTime ) + previousTransform.y;

			 // Now actually transform the entity
			 this.translate(entity, currentPosition.x, currentPosition.y);*/

			// Record the last time we updated the entity so we can disregard any updates
			// that arrive and are before this timestamp (not applicable in TCP but will
			// apply if we ever get UDP in websockets)
			this._lastUpdate = new Date().getTime();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; }