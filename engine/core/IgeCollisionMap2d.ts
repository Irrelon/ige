import IgeEntity from "./IgeEntity";
import IgeMap2d from "./IgeMap2d";

class IgeCollisionMap2d extends IgeEntity {
	classId = "IgeCollisionMap2d";

	constructor (ige, tileWidth, tileHeight) {
		super(ige);
		this.map = new IgeMap2d(ige);
	}

	mapData (val) {
		if (val !== undefined) {
			this.map.mapData(val);
			return this;
		}

		return this.map.mapData();
	}
}

export default IgeCollisionMap2d;