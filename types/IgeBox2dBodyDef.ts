import { IgeBox2dBodyType } from "../enums/IgeBox2dBodyType";
import { IgeBox2dFixtureDef } from "./IgeBox2dFixtureDef";

export interface IgeBox2dBodyDef {
	type: IgeBox2dBodyType;
	linearDamping?: number;
	angularDamping?: number;
	allowSleep?: boolean;
	bullet?: boolean;
	gravitic?: boolean;
	fixedRotation?: boolean;
	fixtures: IgeBox2dFixtureDef[];
}