import type { IgeObject } from "@/engine/core/IgeObject";

export type IgeEntityBehaviourMethod<ParentType extends IgeObject = IgeObject> = (parentObject: ParentType, ...args: any[]) => any;

export interface IgeEntityBehaviour {
	id: string;
	method: IgeEntityBehaviourMethod<any>;
}
