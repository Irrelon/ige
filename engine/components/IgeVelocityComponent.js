// TODO: Doc this class!
import IgeBaseClass from "../src/IgeBaseClass";
import IgePoint3d from "../src/IgePoint3d";

class IgeVelocityComponent extends IgeBaseClass {
	classId = "IgeVelocityComponent";
	componentId = "velocity";

	constructor (ige, entity, options) {
		super(ige);

		this._entity = entity;

		this._velocity = new IgePoint3d(0, 0, 0);
		this._friction = new IgePoint3d(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehaviour("velocity", this._behaviour);
	}

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour = (ige, entity, ctx) => {
		entity.velocity.tick(ctx);
	}

	byAngleAndPower = (radians, power, relative) => {
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
	}

	xyz = (x, y, z, relative) => {
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
	}

	x = (x, relative) => {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}

		return this._entity;
	}

	y = (y, relative) => {
		var vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}

		return this._entity;
	}

	z = (z, relative) => {
		var vel = this._velocity;

		if (!relative) {
			vel.z = z;
		} else {
			vel.z += z;
		}

		return this._entity;
	}

	vector3 = (vector, relative) => {
		if (typeof(vector.scale) !== "number") {
			vector.scale = 1; // Default to 1
		}

		var vel = this._velocity,
			{x} = vector,
			{y} = vector,
			{z} = vector;

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
	}

	friction = (val) => {
		var finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new IgePoint3d(finalFriction, finalFriction, finalFriction);

		return this._entity;
	}

	linearForce = (degrees, power) => {
		power /= 1000;
		var radians = (degrees * Math.PI / 180),
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = x * y;
		this._linearForce = new IgePoint3d(x, y, z);

		return this._entity;
	}

	linearForceXYZ = (x, y, z) => {
		this._linearForce = new IgePoint3d(x, y, z);
		return this._entity;
	}

	linearForceVector3 = (vector, power, relative) => {
		var force = this._linearForce = this._linearForce || new IgePoint3d(0, 0, 0),
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
	}

	_applyLinearForce = (delta) => {
		if (this._linearForce) {
			var vel = this._velocity;

			vel.x += (this._linearForce.x * delta);
			vel.y += (this._linearForce.y * delta);
			vel.z += (this._linearForce.z * delta);
		}
	}

	_applyFriction = () => {
		var vel = this._velocity,
			fric = this._friction;

		vel.x *= fric.x;
		vel.y *= fric.y;
		vel.z *= fric.z;
	}

	tick (ctx) {
		var delta = this._ige._tickDelta,
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
}

export default IgeVelocityComponent;