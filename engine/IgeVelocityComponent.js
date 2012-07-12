IgeVelocityComponent = IgeClass.extend({
	classId: 'IgeVelocityComponent',
	componentId: 'velocity',

	init: function (entity, options) {
		this._entity = entity;
		this._transform = entity.transform;

		this._velocity = new IgePoint(0, 0, 0);
		this._friction = new IgePoint(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehavior('velocity', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param entity
	 * @private
	 */
	_behaviour: function (entity) {
		entity.velocity.tick();
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
	},

	x: function (x, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}
	},

	y: function (y, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}
	},

	z: function (z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.z = y;
		} else {
			vel.z += z;
		}
	},

	vector3: function (vector, relative) {
		if (typeof(vector.scale) !== 'number') {
			vector.scale = 1; // Default to 1
		}
		// TODO: Performance - can we use radians in the call instead of converting here?
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
	},

	friction: function (val) {
		var finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new IgePoint(finalFriction, finalFriction, finalFriction);
	},

	linearForce: function (degrees, power) {
		power /= 1000;
		var radians = (degrees * Math.PI / 180),
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = x * y;
		this._linearForce = new IgePoint(x, y, z);
	},

	linearForceXYZ: function (x, y, z) {
		this._linearForce = new IgePoint(x, y, z);
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

	tick: function () {
		var delta = ige.tickDelta,
			vel = this._velocity;

		if (delta) {
			this._applyLinearForce(delta);
			//this._applyFriction();

			this._transform.translateBy(
				vel.x * delta,
				vel.y * delta,
				vel.z * delta
			);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeVelocityComponent; }