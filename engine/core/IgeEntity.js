// TODO: Should we add some sort of auto-recalculate flag so if the width / height / geom changes it autochanges the aabb and localAabb?
/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
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

		this._geometry = new IgePoint(40, 40, 40);

		this._highlight = false;
		this._mouseEventsActive = false;

        this._localMatrix = new IgeMatrix2d(this);
        this._worldMatrix = new IgeMatrix2d(this);

		this._inView = true;
		this._hidden = false;

		/* CEXCLUDE */
		if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
			// Set the stream floating point precision to 2 as default
			this.streamFloatPrecision(2);
		}
		/* CEXCLUDE */

		// Set the default stream sections as just the transform data
		this.streamSections(['transform']);
	},

	/**
	 * Sets the entity as visible and able to be interacted with.
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	show: function () {
		this._hidden = false;
		return this;
	},

	/**
	 * Sets the entity as hidden and cannot be interacted with.
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	hide: function () {
		this._hidden = true;
		return this;
	},

	/**
	 * Gets the position of the mouse relative to this entity.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @return {IgePoint} The mouse point relative to the entity
	 * center.
	 */
	mousePos: function (viewport) {
		viewport = viewport || ige._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();
			mp.x += viewport._translate.x;
			mp.y += viewport._translate.y;
			this._transformPoint(mp)
			return mp;
		} else {
			return new IgePoint(0, 0, 0);
		}
	},

	/**
	 * Rotates the entity to point at the target point.
	 * @param {IgePoint} point The point in world co-ordinates to
	 * point the entity at.
	 * @return {*}
	 */
	rotateToPoint: function (point) {
		this.rotateTo(
			this._rotate.x,
			this._rotate.y,
			-Math.atan2(this._translate.x - point.x, -this._translate.y - point.y) - this._parent._rotate.z
		);

		return this;
	},

	/**
	 * Gets the position of the mouse relative to this entity not
	 * taking into account viewport translation.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @return {IgePoint} The mouse point relative to the entity
	 * center.
	 */
	mousePosAbsolute: function (viewport) {
		viewport = viewport || ige._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();
			this._transformPoint(mp);
			return mp;
		} else {
			return new IgePoint(0, 0, 0);
		}
	},

	/**
	 * Gets the position of the mouse in world co-ordinates.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @return {IgePoint} The mouse point relative to the world
	 * center.
	 */
	mousePosWorld: function (viewport) {
		viewport = viewport || ige._currentViewport;
		var mp = this.mousePosAbsolute(viewport);
		this.localToWorldPoint(mp, viewport);

		if (this._ignoreCamera) {
			viewport.camera._worldMatrix.transform([mp]);
		}

		return mp;
	},

	/**
	 * Translates the object to the tile co-ordinates passed.
	 * @param {Number} x The x tile co-ordinate.
	 * @param {Number} y The y tile co-ordinate.
	 * @param {Number=} z The z tile co-ordinate.
	 * @private
	 * @return {*} The object this method was called from to allow
	 * method chaining.
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
	 * Gets / sets the texture to use as the background
	 * pattern for this entity.
	 * @param {IgeTexture} texture The texture to use as
	 * the background.
	 * @return {*}
	 */
	backgroundPattern: function (texture, repeat, trackCamera, isoTile) {
		if (texture !== undefined) {
			this._backgroundPattern = texture;
			this._backgroundPatternRepeat = repeat || 'repeat';
			this._backgroundPatternTrackCamera = trackCamera;
			this._backgroundPatternIsoTile = isoTile;
			return this;
		}

		return this._backgroundPattern;
	},

	/**
	 * Set the object's width to the number of tile width's specified.
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new width.
	 * @private
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	widthByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2,
				ratio;

			this.width(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the height based on the new width
					ratio = this._texture._sizeX / this._geometry.x;
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
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the width according
	 * to the texture aspect ratio and the new height.
	 * @private
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	heightByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2,
				ratio;

			this.height(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the width based on the new height
					ratio = this._texture._sizeY / this._geometry.y;
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
		this.log('Cannot occupy a tile because the entity is not currently mounted to a tile map.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile map.
	 */
	overTiles: function () {
		this.log('Cannot determine which tiles this entity lies over because the entity is not currently mounted to a tile map.', 'warning');
	},

	/**
	 * Gets / sets the anchor position that this entity's texture
	 * will be adjusted by.
	 * @param {Number=} x The x anchor value.
	 * @param {Number=} y The y anchor value.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	anchor: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._anchor = new IgePoint(x, y, 0);
			return this;
		}

		return this._anchor;
	},

	/**
	 * Gets / sets the geometry x value.
	 * @param {Number=} px The new x value in pixels.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	width: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the height from the change in width
				var ratio = px / this._geometry.x;
				this.height(this._geometry.y * ratio);
			}

			this._width = px;
			this._geometry.x = px;
			this._geometry.x2 = (px / 2);
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry y value.
	 * @param {Number=} px The new y value in pixels.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	height: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the width from the change in height
				var ratio = px / this._geometry.y;
				this.width(this._geometry.x * ratio);
			}

			this._height = px;
			this._geometry.y = px;
			this._geometry.y2 = (px / 2);
			return this;
		}

		return this._height;
	},

	/**
	 * Gets / sets the 3d geometry of the entity. The x and y values are
	 * relative to the center of the entity and the z value is wholly
	 * positive from the "floor".
	 * @param {Number=} x The new x value in pixels.
	 * @param {Number=} y The new y value in pixels.
	 * @param {Number=} z The new z value in pixels.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	size3d: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._geometry = new IgePoint(x, y, z);
			return this;
		}

		return this._geometry;
	},

	/**
	 * Gets / sets the life span of the object in milliseconds. The life
	 * span is how long the object will exist for before being automatically
	 * destroyed.
	 * @param {Number=} milliseconds The number of milliseconds the entity
	 * will live for from the current time.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	lifeSpan: function (milliseconds) {
		if (milliseconds !== undefined) {
			this.deathTime(ige._currentTime + milliseconds);
			return this;
		}

		return this.deathTime() - ige._currentTime;
	},

	/**
	 * Gets / sets the timestamp in milliseconds that denotes the time
	 * that the entity will be destroyed. The object checks it's own death
	 * time during each tick and if the current time is greater than the
	 * death time, the object will be destroyed.
	 * @param {Number=} val The death time timestamp. This is a time relative
	 * to the engine's start time of zero rather than the current time that
	 * would be retrieved from new Date().getTime(). It is usually easier
	 * to call lifeSpan() rather than setting the deathTime directly.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @param {Number=} val The opacity value.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @param {IgeTexture=} texture The texture object.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @param {Number=} val The cell index.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cell: function (val) {
		if (val > 0 || val === null) {
			this._cell = val;
			return this;
		}

		return this._cell;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored. This differs from cell() in that it accepts a string id
	 * as the cell
	 * @param {Number=} val The cell id.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cellById: function (val) {
		if (val !== undefined) {
			if (this._texture) {
				// Find the cell index this id corresponds to
				var i,
					tex = this._texture,
					cells = tex._cells;

				for (i = 1; i < cells.length; i++) {
					if (cells[i][4] === val) {
						// Found the cell id so assign this cell index
						this.cell(i);
						return this;
					}
				}

				// We were unable to find the cell index from the cell
				// id so produce an error
				this.log('Could not find the cell id "' + val + '" in the assigned entity texture ' + tex.id() + ', please check your sprite sheet (texture) cell definition to ensure the cell id "' + val + '" has been assigned to a cell!', 'error');
			} else {
				this.log('Cannot assign cell index from cell ID until an IgeSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().', 'error');
			}
		}

		return this._cell;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture.
	 * @param {Number=} percent The percentage size to resize to.
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	dimensionsFromTexture: function (percent) {
		if (this._texture) {
			if (percent === undefined) {
				this.width(this._texture._sizeX);
				this.height(this._texture._sizeY);
			} else {
				this.width(Math.floor(this._texture._sizeX / 100 * percent));
				this.height(Math.floor(this._texture._sizeY / 100 * percent));
			}
		}

		return this;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture cell. If the texture is not cell-based
	 * the entire texture width / height will be used.
	 * @return {*} The object this method was called from to allow
	 * method chaining
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
	 * @param {Boolean} val The highlight mode true or false.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * world space using it's world transform matrix. This will alter
	 * the points passed in the array directly.
	 * @param {Array} points The array of IgePoints to convert.
	 */
	localToWorld: function (points, viewport) {
		viewport = viewport || ige._currentViewport;
		this._worldMatrix.transform(points);

		if (this._ignoreCamera) {
			//viewport.camera._worldMatrix.transform(points);
		}
	},

	/**
	 * Converts a point from local space to this entity's world space
	 * using it's world transform matrix. This will alter the point's
	 * data directly.
	 * @param {IgePoint} point The IgePoint to convert.
	 */
	localToWorldPoint: function (point, viewport) {
		viewport = viewport || ige._currentViewport;
		this._worldMatrix.transform([point]);
	},

	/**
	 * Calculates and returns the current axis-aligned bounding box in
	 * world co-ordinates.
	 * @return {IgeRect} The axis-aligned bounding box in world co-ordinates.
	 */
	aabb: function (recalculate) {
		if (recalculate || !this._aabb) {
			var poly = new IgePoly2d(),
				minX, minY,
				maxX, maxY,
				box,
				anc = this._anchor,
				geom = this._geometry,
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

				box = new IgeRect(minX, minY, maxX - minX, maxY - minY);
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

				box = new IgeRect(Math.floor(minX), Math.floor(minY), Math.floor(maxX - minX), Math.floor(maxY - minY));
			}

			this._aabb = box;
		}

		return this._aabb;
	},

	/**
	 * Calculates and returns the local axis-aligned bounding box
	 * for the entity. This is the AABB relative to the entity's
	 * center point.
	 * @param {Boolean=} recalculate If true this will force the
	 * recalculation of the local AABB instead of returning a cached
	 * value.
	 * @return {IgeRect} The local AABB.
	 */
	localAabb: function (recalculate) {
		if (!this._localAabb || recalculate) {
			var aabb = this.aabb();
			this._localAabb = new IgeRect(-Math.floor(aabb.width / 2), -Math.floor(aabb.height / 2), Math.floor(aabb.width), Math.floor(aabb.height));
		}

		return this._localAabb;
	},

	/**
	 * Takes two values and returns them as an array where index [0]
	 * is the y argument and index[1] is the x argument. This method
	 * is used specifically in the 3d bounds intersection process to
	 * determine entity depth sorting.
	 * @param {Number} x The first value.
	 * @param {Number} y The second value.
	 * @return {Array} The swapped arguments.
	 * @private
	 */
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
		// TODO: Potentially caching the IgePoints here unless this._geometry has changed may speed things up somewhat
		var thisG3d = this._geometry,
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
			otherG3d = otherObject._geometry,
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
	 * Compares the current entity's 3d bounds to the passed entity and
	 * determines if the current entity is "behind" the passed one. If an
	 * entity is behind another, it is drawn first during the scenegraph
	 * render phase.
	 * @param {IgeEntity} otherObject The other entity to check this
	 * entity's 3d bounds against.
	 * @return {Boolean} If true this entity is "behind" the passed entity
	 * or false if not.
	 */
	isBehind: function (otherObject) {
		var thisG3d = this._geometry,
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
			otherG3d = otherObject._geometry,
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
	 * Get / set the flag determining if this entity will respond
	 * to mouse interaction or not. When you set a mouse* event e.g.
	 * mouseUp, mouseOver etc this flag will automatically be reset
	 * to true.
	 * @param {Boolean=} val The flag value true or false.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	mouseEventsActive: function (val) {
		if (val !== undefined) {
			this._mouseEventsActive = val;
			return this;
		}

		return this._mouseEventsActive;
	},

	/**
	 * Determines if the frame alternator value for this entity
	 * matches the engine's frame alternator value. The entity's
	 * frame alternator value will be set to match the engine's
	 * after each call to the entity.tick() method so the return
	 * value of this method can be used to determine if the tick()
	 * method has already been run for this entity.
	 *
	 * This is useful if you have multiple viewports which will
	 * cause the entity tick() method to fire once for each viewport
	 * but you only want to execute update code such as movement etc
	 * on the first time the tick() method is called.
	 *
	 * @return {Boolean} If false, the entity's tick method has
	 * not yet been processed for this tick.
	 */
	newFrame: function () {
		return ige._frameAlternator !== this._frameAlternatorCurrent;
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 * @param {Boolean} dontTransform If set to true, the tick method will
	 * not transform the context based on the entity's matrices. This is useful
	 * if you have extended the class and want to process down the inheritance
	 * chain but have already transformed the entity in a previous overloaded
	 * method.
	 */
	tick: function (ctx, dontTransform) {
		// Check if the entity should still exist
		if (this._deathTime !== undefined && this._deathTime <= ige._tickStart) {
			// The entity should be removed because it has died
			this.destroy();
		} else {
			if (this.newFrame()) {
				// Remove the stream data cache
				delete this._streamDataCache;

				// Process any behaviours assigned to the entity
				this._processBehaviours(ctx);

				if (this._timeStream.length) {
					// Process any interpolation
					this._processInterpolate(ige._tickStart - ige.network.stream._renderLatency);
				}

				this._oldTranslate = this._translate.clone();
			}

			if (!this._hidden && this._inView && (!this._parent || (this._parent._inView))) {
				// Process any mouse events we need to do
				var mp, aabb, mouseX, mouseY,
					self = this;

				if (this._mouseEventsActive && ige._currentViewport) {
					mp = this.mousePos();

					if (mp) {
						aabb = this.localAabb(); //this.aabb();
						mouseX = mp.x;
						mouseY = mp.y;

						// Check if the current mouse position is inside this aabb
						//if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
						if (aabb.xyInside(mouseX, mouseY) || this._mouseAlwaysInside) {
							// Point is inside the aabb
							ige.input.queueEvent(this, this._mouseInAabb);
						} else {
							if (ige.input.mouseMove) {
								// There is a mouse move event but we are not inside the entity
								// so fire a mouse out event (_handleMouseOut will check if the
								// mouse WAS inside before firing an out event).
								self._handleMouseOut(ige.input.mouseMove);
							}
						}
					}
				}

				// Transform the context by the current transform settings
				if (!dontTransform) {
					this._transformContext(ctx);
				}

				if (!this._dontRender) {
					// Render the entity
					this._renderEntity(ctx, dontTransform);
				}

				// Process any automatic-mode stream updating required
				if (this._streamMode === 1) {
					this.streamSync();
				}

				// Process children
				this._super(ctx);
			}

			// Update this object's current frame alternator value
			// which allows us to determine if we are still on the
			// same frame if any tick-based methods are called again
			// during this tick frame
			this._frameAlternatorCurrent = ige._frameAlternator;
		}
	},

	/**
	 * Handles calling the texture.render() method if a texture
	 * is applied to the entity. This part of the tick process has
	 * been abstracted to allow it to be overridden by an extending
	 * class.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render
	 * the entity to.
	 * @private
	 */
	_renderEntity: function (ctx) {
		if (this._opacity > 0) {
			// Check if the entity has a background pattern
			if (this._backgroundPattern) {
				if (!this._backgroundPatternFill) {
					// We have a pattern but no fill produced
					// from it. Check if we have a context to
					// generate a pattern from
					if (ctx) {
						// Produce the pattern fill
						this._backgroundPatternFill = ctx.createPattern(this._backgroundPattern.image, this._backgroundPatternRepeat);
					}
				}

				if (this._backgroundPatternFill) {
					// Draw the fill
					ctx.save();
					ctx.fillStyle = this._backgroundPatternFill;

					// TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change

					// This is the proper way to do this but firefox has a bug which I'm gonna report
					// so instead I have to use ANOTHER translate call instead. So crap!
					//ctx.rect(-this._geometry.x2, -this._geometry.y2, this._geometry.x, this._geometry.y);
					ctx.translate(-this._geometry.x2, -this._geometry.y2);
					ctx.rect(0, 0, this._geometry.x, this._geometry.y);
					if (this._backgroundPatternTrackCamera) {
						ctx.translate(-ige._currentCamera._translate.x, -ige._currentCamera._translate.y);
						ctx.scale(ige._currentCamera._scale.x, ige._currentCamera._scale.y);
					}
					ctx.fill();
					ige._drawCount++;

					if (this._backgroundPatternIsoTile) {
						ctx.translate(-Math.floor(this._backgroundPattern.image.width) / 2, -Math.floor(this._backgroundPattern.image.height / 2));
						ctx.fill();
						ige._drawCount++;
					}

					ctx.restore();
				}
			}


			var texture = this._texture;

			// Check if the entity is visible based upon its opacity
			if (texture) {
				// Draw the entity image
				texture.render(ctx, this, ige._tickDelta);

				if (this._highlight) {
					ctx.globalCompositeOperation = 'lighter';
					texture.render(ctx, this);
				}
			}
		}
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to apply
	 * the transformation matrix to.
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
	 * @param {IgePoint} point The point to transform.
	 * @return {IgePoint} The transformed point.
	 * @private
	 */
	_transformPoint: function (point) {
		if (this._parent) {
			var tempMat = new IgeMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.getInverse().transformCoord(point);
		} else {
			this._localMatrix.transformCoord(point);
		}

		return point;
	},

	/**
	 * Checks mouse input types and fires the correct mouse event
	 * handler. This is an internal method that should never be
	 * called externally.
	 * @param {Object} evc The input component event control object.
	 * @param {Object} data Data passed by the input component into
	 * the new event.
	 * @private
	 */
	_mouseInAabb: function (evc, data) {
		if (ige.input.mouseMove) {
			// There is a mouse move event
			this._handleMouseIn(ige.input.mouseMove, evc, data);
		}

		if (ige.input.mouseDown) {
			// There is a mouse down event
			this._handleMouseDown(ige.input.mouseDown, evc, data);
		}

		if (ige.input.mouseUp) {
			// There is a mouse up event
			this._handleMouseUp(ige.input.mouseUp, evc, data);
		}
	},

	/**
	 * Generates a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String} The string code fragment that will
	 * reproduce this entity when evaluated.
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
					case '_geometry':
						str += ".size3d(" + this._geometry.x + ", " + this._geometry.y + ", " + this._geometry.z + ")";
						break;
					case '_deathTime':
						str += ".deathTime(" + this.deathTime() + ")";
						break;
					case '_highlight':
						str += ".highlight(" + this.highlight() + ")";
						break;
				}
			}
		}

		return str;
	},

	/**
	 * Destroys the entity by removing it from the scenegraph,
	 * calling destroy() on any child entities and removing
	 * any active event listeners for the entity. Once an entity
	 * has been destroyed it's this._alive flag is also set to
	 * false.
	 */
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
	/**
	 * Gets / sets the array of sections that this entity will
	 * encode into its stream data.
	 * @param {Array=} sectionArray An array of strings.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @param {Boolean=} bypassTimeStream If true, will assign transform
	 * directly to entity instead of adding the values to the time stream.
	 * @return {*} "this" when a data argument is passed to allow method
	 * chaining or the current value if no data argument is specified.
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

	/* CEXCLUDE */
	/**
	 * Gets / sets the stream mode that the stream system will use when
	 * handling pushing data updates to connected clients.
	 * @param {Number=} val A value representing the stream mode.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @param {Function=} method The stream control method.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamControl: function (method) {
		if (method !== undefined) {
			this._streamControl = method;
			return this;
		}

		return this._streamControl;
	},

	/**
	 * Gets / sets the stream sync interval. This value
	 * is in milliseconds and cannot be lower than 16. It will
	 * determine how often data from this entity is added to the
	 * stream queue.
	 * @param {Number=} val Number of milliseconds between adding
	 * stream data for this entity to the stream queue.
	 * @param {String=} sectionId Optional id of the stream data
	 * section you want to set the interval for. If omitted the
	 * interval will be applied to all sections.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamSyncInterval: function (val, sectionId) {
		if (val !== undefined) {
			if (!sectionId) {
				if (val < 16) {
					delete this._streamSyncInterval;
				} else {
					this._streamSyncDelta = 0;
					this._streamSyncInterval = val;
				}
			} else {
				this._streamSyncSectionInterval = this._streamSyncSectionInterval || {};
				this._streamSyncSectionDelta = this._streamSyncSectionDelta || {};
				if (val < 16) {
					delete this._streamSyncSectionInterval[sectionId];
				} else {
					this._streamSyncSectionDelta[sectionId] = 0;
					this._streamSyncSectionInterval[sectionId] = val;
				}
			}
			return this;
		}

		return this._streamSyncInterval;
	},

	/**
	 * Gets / sets the precision by which floating-point values will
	 * be encoded and sent when packaged into stream data.
	 * @param {Number=} val The number of decimal places to preserve.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
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
	 * @return {IgeEntity} "this".
	 */
	streamSync: function (clientId) {
		if (this._streamMode === 1) {
			// Check if we have a stream sync interval
			if (this._streamSyncInterval) {
				this._streamSyncDelta += ige._tickDelta;

				if (this._streamSyncDelta < this._streamSyncInterval) {
					// The stream sync interval is still higher than
					// the stream sync delta so exit without calling the
					// stream sync method
					return this;
				} else {
					// We've reached the delta we want so zero it now
					// ready for the next loop
					this._streamSyncDelta = 0;
				}
			}

			// Stream mode is automatic so check for the
			// control method
			if (this._streamControl) {
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
	 * Asks the stream system to queue the stream data to
	 * the specified client id or array of ids.
	 * @param {String, Array} clientId The id or array of ids of the
	 * client(s) to queue stream data for. The stream data being queued
	 * is returned by a call to this._streamData().
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
	 * @return {String} The string representation of the stream data for
	 * this entity.
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
				sectionId,
				aliveInt = this._alive ? 1: 0;

			// Add the default data (id and class)
			streamData += this.id() + ',' + this._parent.id() + ',' + this.classId() + ',' + aliveInt;

			// Only send further data if the entity is still "alive"
			if (this._alive) {
				// Now loop the data sections array and compile the rest of the
				// data string from the data section return data
				for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
					sectionData = '';
					sectionId = sectionArr[sectionIndex];

					if (this._streamSyncSectionInterval && this._streamSyncSectionInterval[sectionId]) {
						// Check if the section interval has been reached
						this._streamSyncSectionDelta[sectionId] += ige._tickDelta;
						console.log(this._streamSyncSectionDelta[sectionId]);

						if (this._streamSyncSectionDelta[sectionId] >= this._streamSyncSectionInterval[sectionId]) {
							// Get the section data for this section id
							sectionData = this.streamSectionData(sectionId);

							// Reset the section delta
							this._streamSyncSectionDelta[sectionId] = 0;
						}
					} else {
						// Get the section data for this section id
						sectionData = this.streamSectionData(sectionId);
					}

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
	 * @param {Number} startValue The value that the interpolation started from.
	 * @param {Number} endValue The target value to be interpolated to.
	 * @param {Number} startTime The time the interpolation started.
	 * @param {Number} currentTime The current time.
	 * @param {Number} endTime The time the interpolation will end.
	 * @return {Number} The interpolated value.
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

	/**
	 * Processes the time stream for the entity.
	 * @param {Number} renderTime The time that the time stream is
	 * targetting to render the entity at.
	 * @param {Number} maxLerp The maximum lerp before the value
	 * is assigned directly instead of being interpolated.
	 * @private
	 */
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
			if (timeStream[i][0] > renderTime) {
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
					this.emit('interpolationLag');
				}
			}
		} else {
			// We have some new data so clear the old data
			timeStream.splice(0, i - 1);
		}

		// If we have data to use
		if (nextData && previousData) {
			/*previousData = [
				previousData[0],
				[
					this._translate.x,
					this._translate.y,
					this._translate.z,

					this._scale.x,
					this._scale.y,
					this._scale.z,

					this._rotate.x,
					this._rotate.y,
					this._rotate.z
				]
			];*/

			// Store the data so outside systems can access them
			this._timeStreamPreviousData = previousData;
			this._timeStreamNextData = nextData;

			// Calculate the delta times
			dataDelta = nextData[0] - previousData[0];
			offsetDelta = renderTime - previousData[0];

			this._timeStreamDataDelta = Math.floor(dataDelta);
			this._timeStreamOffsetDelta = Math.floor(offsetDelta);

			// Calculate the current time between the two data points
			currentTime = offsetDelta / dataDelta;

			this._timeStreamCurrentInterpolateTime = currentTime;

			// Clamp the current time from 0 to 1
			//if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }

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