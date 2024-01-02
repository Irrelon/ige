import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";

export declare class GameEntity extends IgeEntity {
	constructor();
	mount(obj: IgeObject): this;
	onStreamProperty(propName: string, propVal: any): this;
}
