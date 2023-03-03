import IgeEntity from "./IgeEntity.js";
import IgeMap2d from "./IgeMap2d.js";
class IgeCollisionMap2d extends IgeEntity {
    constructor(ige, tileWidth, tileHeight) {
        super(ige);
        this.classId = "IgeCollisionMap2d";
        this.map = new IgeMap2d(ige);
    }
    mapData(val) {
        if (val !== undefined) {
            this.map.mapData(val);
            return this;
        }
        return this.map.mapData();
    }
}
export default IgeCollisionMap2d;
