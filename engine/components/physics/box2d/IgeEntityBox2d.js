/**
 * Creates a new isometric 3d entity.
 */
var IgeEntityBox2d = IgeEntity.extend({
	classId: 'IgeEntityBox2d',

	init: function () {
		this._super();

		// Store the existing transform methods
		this._translateToProto = this.translateTo;
		this._translateByProto = this.translateBy;

		this._rotateToProto = this.rotateTo;
		this._rotateByProto = this.rotateBy;

		// Take over the transform methods
		this.translateTo = this._translateTo;
		this.translateBy = this._translateBy;

		this.rotateTo = this._rotateTo;
		this.rotateBy = this._rotateBy;
	},

	/**
	 * Gets / sets the physics body definition. When setting the
	 * definition the physics body will also be created automatically
	 * from the supplied definition.
	 * @param def
	 * @return {*}
	 */
	box2dBody: function (def) {
		if (def !== undefined) {
			this._box2dBodyDef = def;

			// Check that the box2d component exists
			if (ige.box2d) {
				// Ask the box2d component to create a new body for us
				this._box2dBody = ige.box2d.createBody(this, def);
			} else {
				this.log('You are trying to create a box2d entity but you have not added the box2d component to the ige instance!', 'error');
			}

			return this;
		}

		return this._box2dBodyDef;
	},

	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_translateTo: function (x, y, z) {
		var entBox2d = this._box2dBody;

		// Call the original method
		this._translateToProto(x, y, z);

		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a box2d definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetPosition({x: x / ige.box2d._scaleRatio, y: y / ige.box2d._scaleRatio});
			entBox2d.SetAwake(true);
		}

		return this;
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_translateBy: function (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y, this._translate.z + z);
	},

	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_rotateTo: function (x, y, z) {
		var entBox2d = this._box2dBody;

		// Call the original method
		this._rotateToProto(x, y, z);

		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a box2d definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetAngle(z);
			entBox2d.SetAwake(true);
		}

		return this;
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_rotateBy: function (x, y, z) {
		this._rotateTo(this._rotate.x + x, this._rotate.y + y, this._rotate.z + z);
	},

	/**
	 * Destroys the physics entity and the box2d body that
	 * is attached to it.
	 */
	destroy: function () {
		if (this._box2dBody) {
			ige.box2d.destroyBody(this._box2dBody);
		}
		this._super();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntityBox2d; }