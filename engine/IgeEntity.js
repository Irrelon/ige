var IgeEntity = IgeObject.extend([
	{extension: IgeTransformExtension, overwrite: false}
], {
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._mode = 0;
		this._opacity = 1;
		this._cell = 1;

		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

		this.geometry = new IgePoint(20, 20, 20);
		this.geometry3d = new IgePoint(0, 0, 0);

		this._anchor = {x: 0, y: 0};

        this._localMatrix = new IgeMatrix2d(this);
        this._worldMatrix = new IgeMatrix2d(this);
	},

	/**
	 * Gets / sets the positioning mode of the entity.
	 * @param val 0 = 2d, 1 = isometric
	 * @return {*}
	 */
	mode: function (val) {
		if (val !== undefined) {
			this._mode = val;
			return this;
		}

		return this._mode;
	},

	/**
	 * Gets / sets the positioning mode of the entity as isometric.
	 * @param {Boolean} val
	 * @return {*}
	 */
	isometric: function (val) {
		if (val === true) {
			this._mode = 1;
			return this;
		}

		if (val === false) {
			this._mode = 0;
			return this;
		}

		return this._mode === 1;
	},

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			this._id = id;
			return this;
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = ige.newIdHex();
		}

		return this._id;
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile sheet.
	 */
	translateToTile: function () {
		this.log('Cannot translate to tile because the entity is not currentlymounted to a tile sheet.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile sheet.
	 */
	widthByTile: function () {
		this.log('Cannot set width by tile because the entity is not currentlymounted to a tile sheet.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile sheet.
	 */
	heightByTile: function () {
		this.log('Cannot set height by tile because the entity is not currently mounted to a tile sheet.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile sheet.
	 */
	occupyTile: function () {
		this.log('Cannot occupy a tile because the entity is not currently mounted to a tile sheet.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile sheet.
	 */
	overTiles: function () {
		this.log('Cannot determine which tiles this entity lies over because the entity is not currently mounted to a tile sheet.', 'warning');
	},

	anchor: function (x, y) {
		this._anchor = {x: x, y: y};
		return this;
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
			this.geometry3d = new IgePoint(x, y, z);
			return this;
		}

		return this.geometry3d;
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
	aabb: function () {
		var poly = new IgePoly2d(),
			minX, minY,
			maxX, maxY,
			box = {},
			anc = this._anchor;

		poly.addPoint(-this.geometry.x2 + anc.x, -this.geometry.y2 + anc.y);
		poly.addPoint(this.geometry.x2 + anc.x, -this.geometry.y2 + anc.y);
		poly.addPoint(this.geometry.x2 + anc.x, this.geometry.y2 + anc.y);
		poly.addPoint(-this.geometry.x2 + anc.x, this.geometry.y2 + anc.y);

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

		return box;
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
		var thisG3d = this.geometry3d,
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
			otherG3d = otherObject.geometry3d,
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
		var thisG3d = this.geometry3d,
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
			otherG3d = otherObject.geometry3d,
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

		if (this._parent) {
			// TODO: Does this only work one level deep? we need to alter a _worldOpacity property down the chain
			ctx.globalAlpha = this._parent._opacity * this._opacity;
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
			ctx.globalAlpha = this._opacity;
		}

		this._localMatrix.transformRenderingContext(ctx);
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
		if (this._deathTime !== undefined && this._deathTime <= ige.tickStart) {
			// The entity should be removed because it has died
			this.destroy();
		} else {
			// Process any behaviours assigned to the entity
			this._processBehaviours(ctx);

			// Get the current texture
			var texture = this._texture;

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

			this._super(ctx);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; }