"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeVelocityComponent = void 0;
// TODO: Doc this class!
const instance_1 = require("../instance");
const IgePoint3d_1 = require("../core/IgePoint3d");
const IgeComponent_1 = require("../core/IgeComponent");
const IgeBehaviourType_1 = require("../../enums/IgeBehaviourType.js");
class IgeVelocityComponent extends IgeComponent_1.IgeComponent {
	constructor(entity, options) {
		super(entity, options);
		this.classId = "IgeVelocityComponent";
		this.componentId = "velocity";
		/**
		 * The behaviour method executed each tick.
		 * @private
		 */
		this._behaviour = () => {
			this.tick();
		};
		this.xyz = (x, y, z, relative = false) => {
			const vel = this._velocity;
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
		};
		this.x = (x, relative = false) => {
			const vel = this._velocity;
			if (!relative) {
				vel.x = x;
			} else {
				vel.x += x;
			}
			return this._entity;
		};
		this.y = (y, relative = false) => {
			const vel = this._velocity;
			if (!relative) {
				vel.y = y;
			} else {
				vel.y += y;
			}
			return this._entity;
		};
		this.z = (z, relative = false) => {
			const vel = this._velocity;
			if (!relative) {
				vel.z = z;
			} else {
				vel.z += z;
			}
			return this._entity;
		};
		this.vector3 = (vector, relative = false) => {
			if (typeof vector.scale !== "number") {
				vector.scale = 1; // Default to 1
			}
			const vel = this._velocity,
				{ x } = vector,
				{ y } = vector,
				{ z } = vector;
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
		};
		this.friction = (val) => {
			let finalFriction = 1 - val;
			if (finalFriction < 0) {
				finalFriction = 0;
			}
			this._friction = new IgePoint3d_1.IgePoint3d(finalFriction, finalFriction, finalFriction);
			return this._entity;
		};
		this.linearForce = (degrees, power) => {
			power /= 1000;
			const radians = (degrees * Math.PI) / 180,
				x = Math.cos(radians) * power,
				y = Math.sin(radians) * power,
				z = x * y;
			this._linearForce = new IgePoint3d_1.IgePoint3d(x, y, z);
			return this._entity;
		};
		this.linearForceXYZ = (x, y, z) => {
			this._linearForce = new IgePoint3d_1.IgePoint3d(x, y, z);
			return this._entity;
		};
		this.linearForceVector3 = (vector, relative = false) => {
			const force = (this._linearForce = this._linearForce || new IgePoint3d_1.IgePoint3d(0, 0, 0)),
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
		};
		this._applyLinearForce = (delta) => {
			if (this._linearForce) {
				const vel = this._velocity;
				vel.x += this._linearForce.x * delta;
				vel.y += this._linearForce.y * delta;
				vel.z += this._linearForce.z * delta;
			}
		};
		this._applyFriction = () => {
			const vel = this._velocity,
				fric = this._friction;
			vel.x *= fric.x;
			vel.y *= fric.y;
			vel.z *= fric.z;
		};
		this._velocity = new IgePoint3d_1.IgePoint3d(0, 0, 0);
		this._friction = new IgePoint3d_1.IgePoint3d(1, 1, 1);
		// Add the velocity behaviour to the entity
		entity.addBehaviour(IgeBehaviourType_1.IgeBehaviourType.preUpdate, "velocity", this._behaviour);
	}
	byAngleAndPower(radians, power, relative = false) {
		const vel = this._velocity,
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
	tick() {
		const delta = instance_1.ige.engine._tickDelta;
		const vel = this._velocity;
		if (delta) {
			this._applyLinearForce(delta);
			//this._applyFriction();
			const x = vel.x * delta;
			const y = vel.y * delta;
			const z = vel.z * delta;
			if (x || y || z) {
				this._entity.translateBy(x, y, z);
			}
		}
	}
}
exports.IgeVelocityComponent = IgeVelocityComponent;
