var IgeEntity = IgeObject.extend({
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._layer = 1;
		this._opacity = 1;
		this._cell = 1;

		this.transform = new IgeTransform(this);
		this.geometry = new IgePoint(20, 20, 20);
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
	 * Gets / sets the current entity layer.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	layer: function (val) {
		if (val !== undefined) {
			this._layer = val;
			return this;
		}

		return this._layer;
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
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param ctx
	 * @private
	 */
	_transformContext: function (ctx) {
		var tf = this.transform;

		ctx.translate(tf._translate.x, tf._translate.y);
		ctx.rotate(tf._rotate.z);
		ctx.scale(tf._scale.x, tf._scale.y);
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (dontTransform) {
		var ctx = ige._ctx,
			texture = this._texture;

		// Transform the context by the current transform settings
		if (!dontTransform) {
			this._transformContext(ctx);
		}

		// Process any behaviours assigned to the entity
		this._processBehaviours();

		// Check if the entity is visible based upon its opacity
		if (this._opacity > 0 && texture) {
			// Draw the entity image
			texture.render(ctx, this, ige.tickDelta);

			if (this._highlight) {
				ctx.globalCompositeOperation = 'lighter';
				texture.render(ctx, this);
			}
		}

		this._super();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; }