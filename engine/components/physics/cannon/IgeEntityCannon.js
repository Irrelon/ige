/**
 * Creates a new isometric 3d entity.
 */
var IgeEntityCannon = IgeEntity.extend({
	classId: 'IgeEntityCannon',

	init: function () {
		IgeEntity.prototype.init.call(this);

		// Store the existing translate methods
		this._translateToProto = this.translateTo;
		this._translateByProto = this.translateBy;

		// Take over the translate methods
		this.translateTo = this._translateTo;
		this.translateBy = this._translateBy;
	},

	cannonBody: function (def) {
		if (def !== undefined) {
			this._cannonBodyDef = def;

			// Ask the cannon component to create a new body for us
			this._cannonBody = ige.cannon.createBody(this, def);

			return this;
		}

		return this._cannonBodyDef;
	},

	_translateTo: function (x, y, z) {
		var entCannon = this._cannonBody,
			scaleRatio = ige.cannon._scaleRatio;

		// Check if the entity has a cannon body attached
		// and if so, is it updating or not
		if (entCannon && !entCannon._igeUpdating) {
			// We have an entity with a cannon definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entCannon.position.x = x / scaleRatio;
			entCannon.position.y = y / scaleRatio;
			entCannon.position.z = (z + this._geometry.z2) / scaleRatio;
		}

		// Now call the original translate method
		this._translateToProto(x, y, z);

		return this;
	},

	_translateBy: function (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y, this._translate.z + z);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntityCannon; }