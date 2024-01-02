import { IgeComponent } from "../core/IgeComponent";
import { IgeEntity } from "../core/IgeEntity";
import { IgePoint3d } from "../core/IgePoint3d";

export declare class IgeVelocityComponent extends IgeComponent {
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
	byAngleAndPower(radians: number, power: number, relative?: boolean): any;
	xyz: (x: number, y: number, z: number, relative?: boolean) => any;
	x: (x: number, relative?: boolean) => any;
	y: (y: number, relative?: boolean) => any;
	z: (z: number, relative?: boolean) => any;
	vector3: (vector: IgePoint3d, relative?: boolean) => any;
	friction: (val: number) => any;
	linearForce: (degrees: number, power: number) => any;
	linearForceXYZ: (x: number, y: number, z: number) => any;
	linearForceVector3: (vector: IgePoint3d, relative?: boolean) => any;
	_applyLinearForce: (delta: number) => void;
	_applyFriction: () => void;
	tick(): void;
}
