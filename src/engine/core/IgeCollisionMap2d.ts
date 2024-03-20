import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeMap2d } from "@/engine/core/IgeMap2d";

// TODO: Does this NEED to be an IgeEntity or can it be an IgeObject?
export class IgeCollisionMap2d extends IgeEntity {
	classId = "IgeCollisionMap2d";
	map: IgeMap2d;

	constructor () {
		super();
		this.map = new IgeMap2d();
	}

	mapData (val?: number[][]) {
		if (val !== undefined) {
			this.map.mapData(val);
			return this;
		}

		return this.map.mapData();
	}
}
