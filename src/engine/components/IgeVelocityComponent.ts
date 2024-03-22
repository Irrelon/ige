import { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";

export class IgeVelocityComponent extends IgeComponent<IgeEntity> {
	classId = "IgeVelocityComponent";
	componentId = "velocity";

	_velocity: IgePoint3d;
	_friction: IgePoint3d;
	_linearForce?: IgePoint3d;

	constructor (entity: IgeEntity, options?: any) {
		super(entity, options);

		this._velocity = new IgePoint3d(0, 0, 0);
		this._friction = new IgePoint3d(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehaviour(IgeBehaviourType.preUpdate, "velocity", this._behaviour);
	}

	/**
	 * The behaviour method executed each tick.
	 * @private
	 */
	_behaviour = () => {
		this.tick();
	};

	byAngleAndPower (radians: number, power: number, relative: boolean = false) {
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

	xyz = (x: number, y: number, z: number, relative: boolean = false) => {
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

	x = (x: number, relative: boolean = false) => {
		const vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}

		return this._entity;
	};

	y = (y: number, relative: boolean = false) => {
		const vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}

		return this._entity;
	};

	z = (z: number, relative: boolean = false) => {
		const vel = this._velocity;

		if (!relative) {
			vel.z = z;
		} else {
			vel.z += z;
		}

		return this._entity;
	};

	vector3 = (vector: IgePoint3d, relative: boolean = false) => {
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

	friction = (val: number) => {
		let finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new IgePoint3d(finalFriction, finalFriction, finalFriction);

		return this._entity;
	};

	linearForce = (degrees: number, power: number) => {
		power /= 1000;
		const radians = (degrees * Math.PI) / 180,
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = x * y;
		this._linearForce = new IgePoint3d(x, y, z);

		return this._entity;
	};

	linearForceXYZ = (x: number, y: number, z: number) => {
		this._linearForce = new IgePoint3d(x, y, z);
		return this._entity;
	};

	linearForceVector3 = (vector: IgePoint3d, relative = false) => {
		const force = (this._linearForce = this._linearForce || new IgePoint3d(0, 0, 0)),
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

	_applyLinearForce = (delta: number) => {
		if (this._linearForce) {
			const vel = this._velocity;

			vel.x += this._linearForce.x * delta;
			vel.y += this._linearForce.y * delta;
			vel.z += this._linearForce.z * delta;
		}
	};

	_applyFriction = () => {
		const vel = this._velocity,
			fric = this._friction;

		vel.x *= fric.x;
		vel.y *= fric.y;
		vel.z *= fric.z;
	};

	tick () {
		const delta = ige.engine._tickDelta;
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
