import { IgeComponent } from "../core/IgeComponent.js"
import { IgePoint3d } from "../core/IgePoint3d.js"
import { ige } from "../instance.js"
import { IgeBehaviourType } from "../../enums/index.js"
export class IgeVelocityComponent extends IgeComponent {
    classId = "IgeVelocityComponent";
    componentId = "velocity";
    _velocity;
    _friction;
    _linearForce;
    constructor(entity, options) {
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
    byAngleAndPower(radians, power, relative = false) {
        const vel = this._velocity, x = Math.cos(radians) * power, y = Math.sin(radians) * power, z = 0;
        if (!relative) {
            vel.x = x;
            vel.y = y;
            vel.z = z;
        }
        else {
            vel.x += x;
            vel.y += y;
            vel.z += z;
        }
        return this._entity;
    }
    xyz = (x, y, z, relative = false) => {
        const vel = this._velocity;
        if (!relative) {
            vel.x = x;
            vel.y = y;
            vel.z = z;
        }
        else {
            vel.x += x;
            vel.y += y;
            vel.z += z;
        }
        return this._entity;
    };
    x = (x, relative = false) => {
        const vel = this._velocity;
        if (!relative) {
            vel.x = x;
        }
        else {
            vel.x += x;
        }
        return this._entity;
    };
    y = (y, relative = false) => {
        const vel = this._velocity;
        if (!relative) {
            vel.y = y;
        }
        else {
            vel.y += y;
        }
        return this._entity;
    };
    z = (z, relative = false) => {
        const vel = this._velocity;
        if (!relative) {
            vel.z = z;
        }
        else {
            vel.z += z;
        }
        return this._entity;
    };
    vector3 = (vector, relative = false) => {
        if (typeof vector.scale !== "number") {
            vector.scale = 1; // Default to 1
        }
        const vel = this._velocity, { x } = vector, { y } = vector, { z } = vector;
        if (!relative) {
            vel.x = x;
            vel.y = y;
            vel.z = z;
        }
        else {
            vel.x += x;
            vel.y += y;
            vel.z += z;
        }
        return this._entity;
    };
    friction = (val) => {
        let finalFriction = 1 - val;
        if (finalFriction < 0) {
            finalFriction = 0;
        }
        this._friction = new IgePoint3d(finalFriction, finalFriction, finalFriction);
        return this._entity;
    };
    linearForce = (degrees, power) => {
        power /= 1000;
        const radians = (degrees * Math.PI) / 180, x = Math.cos(radians) * power, y = Math.sin(radians) * power, z = x * y;
        this._linearForce = new IgePoint3d(x, y, z);
        return this._entity;
    };
    linearForceXYZ = (x, y, z) => {
        this._linearForce = new IgePoint3d(x, y, z);
        return this._entity;
    };
    linearForceVector3 = (vector, relative = false) => {
        const force = (this._linearForce = this._linearForce || new IgePoint3d(0, 0, 0)), x = vector.x / 1000, y = vector.y / 1000, z = vector.z / 1000;
        if (!relative) {
            force.x = x || 0;
            force.y = y || 0;
            force.z = z || 0;
        }
        else {
            force.x += x || 0;
            force.y += y || 0;
            force.z += z || 0;
        }
        return this._entity;
    };
    _applyLinearForce = (delta) => {
        if (this._linearForce) {
            const vel = this._velocity;
            vel.x += this._linearForce.x * delta;
            vel.y += this._linearForce.y * delta;
            vel.z += this._linearForce.z * delta;
        }
    };
    _applyFriction = () => {
        const vel = this._velocity, fric = this._friction;
        vel.x *= fric.x;
        vel.y *= fric.y;
        vel.z *= fric.z;
    };
    tick() {
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
