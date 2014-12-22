// TODO: Doc this class!
var IgeVelocityComponent = IgeClass.extend({
	classId: 'IgeVelocityComponent',
	componentId: 'velocity',

	init: function (entity, options) {
		this._entity = entity;

		this._velocity = new IgePoint(0, 0, 0);
		this._friction = new IgePoint(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehaviour('velocity', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		this.velocity.tick(ctx);
	},

	byAngleAndPower: function (radians, power, relative) {
		var vel = this._velocity,
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = 0;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	xyz: function (x, y, z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	x: function (x, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}

		return this._entity;
	},

	y: function (y, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}

		return this._entity;
	},

	z: function (z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.z = y;
		} else {
			vel.z += z;
		}

		return this._entity;
	},

	vector3: function (vector, relative) {
		if (typeof(vector.scale) !== 'number') {
			vector.scale = 1; // Default to 1
		}

		var vel = this._velocity,
			x = vector.x,
			y = vector.y,
			z = vector.z;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	friction: function (val) {
		var finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new IgePoint(finalFriction, finalFriction, finalFriction);

		return this._entity;
	},

	linearForce: function (degrees, power) {
		power /= 1000;
		var radians = (degrees * Math.PI / 180),
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = x * y;
		this._linearForce = new IgePoint(x, y, z);

		return this._entity;
	},

	linearForceXYZ: function (x, y, z) {
		this._linearForce = new IgePoint(x, y, z);
		return this._entity;
	},

	linearForceVector3: function (vector, power, relative) {
		var force = this._linearForce = this._linearForce || new IgePoint(0, 0, 0),
			x = vector.x / 1000,
			y = vector.y / 1000,
			z = vector.z / 1000;

		if (!relative) {
			force.x = x || 0;
			force.y = y || 0;
			force.z = z || 0;
		} else {
			force.x += x || 0;
			force.y += y || 0;
			force.z += z || 0;
		}

		return this._entity;
	},

	_applyLinearForce: function (delta) {
		if (this._linearForce) {
			var vel = this._velocity;

			vel.x += (this._linearForce.x * delta);
			vel.y += (this._linearForce.y * delta);
			vel.z += (this._linearForce.z * delta);
		}
	},

	_applyFriction: function () {
		var vel = this._velocity,
			fric = this._friction;

		vel.x *= fric.x;
		vel.y *= fric.y;
		vel.z *= fric.z;
	},

	tick: function (ctx) {
		var delta = ige._tickDelta,
			vel = this._velocity,
			x, y, z;

		if (delta) {
			this._applyLinearForce(delta);
			//this._applyFriction();

			x = vel.x * delta;
			y = vel.y * delta;
			z = vel.z * delta;

			if (x || y || z) {
				this._entity.translateBy(x, y, z);
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeVelocityComponent; }