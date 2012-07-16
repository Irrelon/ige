var IgeEntity = IgeObject.extend([
	{extension: IgeTransformExtension, overwrite: false}
], {
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._opacity = 1;
		this._cell = 1;

		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

		this.geometry = new IgePoint(20, 20, 20);

        this._localMatrix = new IgeMatrix2d(this); //modelViewMatrix
        this._worldMatrix = new IgeMatrix2d(this); //worldModelViewMatrix
        //this.modelViewMatrixI = new IgeMatrix2d();
        //this.worldModelViewMatrixI = new IgeMatrix2d();
        //this.tmpMatrix = new IgeMatrix2d();
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
	 * Gets / sets the geometry.x in pixels.
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
	 * Gets / sets the geometry.y in pixels.
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
	 * @see IgeObject.mount
	 */
	mount: function (obj) {
		var ret = this._super(obj);
		return ret;
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
			box = {};

		poly.addPoint(-this.geometry.x2, -this.geometry.y2);
		poly.addPoint(this.geometry.x2, -this.geometry.y2);
		poly.addPoint(this.geometry.x2, this.geometry.y2);
		poly.addPoint(-this.geometry.x2, this.geometry.y2);

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
		/*
		if (this._worldTranslate) {
			var originTranslate = this.centerPoint(),
				width2 = ((this.geometry.x * this._worldScale.x) / 2),
				height2 = ((this.geometry.y * this._worldScale.y) / 2),
				r = (this._rotate.z),
				cornerX1 = width2,
				cornerX2 = width2,
				cornerY1 = -height2,
				cornerY2 = height2,

				sinO = Math.sin(r),
				cosO = Math.cos(r),

				rotatedCorner1X = (cornerX1 * cosO - cornerY1 * sinO),
				rotatedCorner1Y = (cornerX1 * sinO - cornerY1 * cosO),
				rotatedCorner2X = (cornerX2 * cosO - cornerY2 * sinO),
				rotatedCorner2Y = (cornerX2 * sinO - cornerY2 * cosO),

				extentX = (Math.max(Math.abs(rotatedCorner1X), Math.abs(rotatedCorner2X))),
				extentY = Math.max(Math.abs(rotatedCorner1Y), Math.abs(rotatedCorner2Y)),

				// Rotate the worldTranslate point by the parent rotation
				pr = (this._parent && this._parent._rotate) ? -(this._parent._rotate.z) : 0,
				wtPoint = this._rotatePoint(this._translate, pr, {x: 0, y: 0}),
				origin = this._rotatePoint(originTranslate, -r, {x: 0, y: 0});

			return {
				x: wtPoint.x + (this._parent._translate ? this._parent._translate.x : 0) - extentX + ige.geometry.x2 - origin.x,
				y: wtPoint.y + (this._parent._translate ? this._parent._translate.y : 0) - extentY + ige.geometry.y2 - origin.y,
				width: extentX * 2,
				height: extentY * 2
			};
		}
		*/
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param ctx
	 * @private
	 */
	_transformContext: function (ctx) {
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
	 */
	tick: function (ctx, dontTransform) {
		if (this._deathTime !== undefined && this._deathTime <= ige.tickStart) {
			// The entity should be removed because it has died
			this.destroy();
		} else {
			// Process any behaviours assigned to the entity
			this._processBehaviours(ctx);

			// Check for changes to the transform values
			// directly without calling the transform methods
			this.updateTransform();

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