import {IgeEntity} from "./IgeEntity";

export class IgeCollisionMap2d extends IgeEntity {
	_classId = 'IgeCollisionMap2d';

	constructor (props, tileWidth, tileHeight) {
		super(props);

		this.map = new IgeMap2d();
	}

	mapData (val) {
		if (val !== undefined) {
			this.map.mapData(val);
			return this;
		}

		return this.map.mapData();
	}
}
