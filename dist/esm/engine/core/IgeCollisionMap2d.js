import { IgeEntity } from "./IgeEntity.js"
import { IgeMap2d } from "./IgeMap2d.js"
// TODO: Does this NEED to be an IgeEntity or can it be an IgeObject?
export class IgeCollisionMap2d extends IgeEntity {
    classId = "IgeCollisionMap2d";
    map;
    constructor() {
        super();
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
