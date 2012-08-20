/**
 * When added to an entity, takes over the translateTo and translateBy
 * methods and makes sure that the passed co-ordinates don't intersect
 * the entity's assigned collision map before allowing the translate
 * operation.
 */
var IgeCollisionComponent = IgeEventingClass.extend({
	classId: 'IgeCollisionComponent',
	componentId: 'collision',

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Check if we are being added to the ige instance or not
		if (this._entity.classId() === 'IgeEngine') {
			// Create a collision check array
			ige._collisionCheck = [];

			// Add a behaviour directly to the ige instance
			ige.addBehaviour('collisionCheck', this._behaviour);
		} else {
			// Create a poly store
			this._polyStore = [];

			/*// Store the existing translate methods
			 this._entity._translateToProto = this._entity.translateTo;
			 this._entity._translateByProto = this._entity.translateBy;

			 // Take over the translate methods
			 this._entity.translateTo = this._translateTo;
			 this._entity.translateBy = this._translateBy;*/

			// Set the component to inactive to start with
			this._enabled = false;

			// Add this entity to the ige global collision check array
			ige._collisionCheck.push(this._entity);
		}


	},

	_behaviour: function (ctx) {
		var i, k, arr = this._collisionCheck,
			arrCount = arr.length;

		for (i = 0; i < arrCount; i++) {
			for (k = 0; k < arrCount; k++) {
				if (i !== k) {
					// Check if these two items are colliding

				}
			}
		}
	},

	/**
	 * Sets / gets the enabled flag. If set to true, pan
	 * operations will be processed. If false, no panning will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			return this._entity;
		}

		return this._enabled;
	},

	/**
	 * Adds a collision polygon.
	 * @param {IgePoly2d=} poly
	 * @return {*}
	 */
	addPoly: function (poly, polyClass, type) {
		if (poly !== undefined) {
			/*var geom = this._entity.geometry,
				polyArray = poly._poly;*/

			this._polyStore.push({
				poly: poly,
				polyClass: polyClass,
				polyType: type
			});
			/*this._polyAbsolute = new IgePoly2d()
				.addPoint(geom.x * polyArray[0].x, geom.y * polyArray[0].y)
				.addPoint(geom.x * polyArray[1].x, geom.y * polyArray[1].y)
				.addPoint(geom.x * polyArray[2].x, geom.y * polyArray[2].y)
				.addPoint(geom.x * polyArray[3].x, geom.y * polyArray[3].y);*/
		}

		return this._entity;
	},

	/**
	 * Returns true if the passed world co-ordinates intersect any
	 * existing polygon.
	 * @param x
	 * @param y
	 */
	_isColliding: function (x, y) {
		return false;
	},

	/*_translateTo: function (x, y, z) {
		if (!this.collision._isColliding(x, y)) {
			return this._translateToProto(x, y, z);
		}

		return this;
	},

	_translateBy: function (x, y, z) {
		var i, polyAbsolute = this.collision._polyAbsolute,
			polyArray = polyAbsolute._poly,
			arrCount = polyAbsolute.length(),
			polyPoint;

		for (i = 0; i < arrCount; i++) {
			// Check each point of the poly for a collision
			polyPoint = polyArray[i];

			if (this.collision._isColliding(this._translate.x + x + polyPoint.x + (this.collision._map._tileWidth / 2), this._translate.y + y + polyPoint.y + (this.collision._map._tileHeight / 2))) {
				return this;
			}
		}

		return this._translateByProto(x, y, z);
	}*/
});