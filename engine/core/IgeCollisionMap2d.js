import IgeEntity from "./IgeEntity.js";
import IgeMap2d from "./IgeMap2d.js";
class IgeCollisionMap2d extends IgeEntity {
    constructor() {
        super();
        this.classId = "IgeCollisionMap2d";
        this.map = new IgeMap2d();
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
