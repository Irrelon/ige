import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEntity } from "../core/IgeEntity.js";
import { IgePoint3d } from "../core/IgePoint3d.js"
export declare class IgeVelocityComponent extends IgeComponent<IgeEntity> {
    classId: string;
    componentId: string;
    _velocity: IgePoint3d;
    _friction: IgePoint3d;
    _linearForce?: IgePoint3d;
    constructor(entity: IgeEntity, options?: any);
    /**
     * The behaviour method executed each tick.
     * @private
     */
    _behaviour: () => void;
    byAngleAndPower(radians: number, power: number, relative?: boolean): IgeEntity;
    xyz: (x: number, y: number, z: number, relative?: boolean) => IgeEntity;
    x: (x: number, relative?: boolean) => IgeEntity;
    y: (y: number, relative?: boolean) => IgeEntity;
    z: (z: number, relative?: boolean) => IgeEntity;
    vector3: (vector: IgePoint3d, relative?: boolean) => IgeEntity;
    friction: (val: number) => IgeEntity;
    linearForce: (degrees: number, power: number) => IgeEntity;
    linearForceXYZ: (x: number, y: number, z: number) => IgeEntity;
    linearForceVector3: (vector: IgePoint3d, relative?: boolean) => IgeEntity;
    _applyLinearForce: (delta: number) => void;
    _applyFriction: () => void;
    tick(): void;
}
