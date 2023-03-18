import { registerClass } from "../../engine/services/igeClassStore";
import { Square } from "./base/Square";
export class StorageBuilding extends Square {
    constructor() {
        super();
        this.classId = "StorageBuilding";
        this.depth(1);
    }
    streamCreateConstructorArgs() {
        return [];
    }
}
registerClass(StorageBuilding);
