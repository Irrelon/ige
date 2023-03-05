import IgeEntity from "./IgeEntity";
import IgeMap2d from "./IgeMap2d";

class IgeCollisionMap2d extends IgeEntity {
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

export default IgeCollisionMap2d;