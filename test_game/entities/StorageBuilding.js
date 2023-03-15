import { registerClass } from "../../engine/services/igeClassStore.js";
import { Square } from "./base/Square.js";
export class StorageBuilding extends Square {
    constructor() {
        super();
        this.classId = "StorageBuilding";
    }
    streamCreateConstructorArgs() {
        return [];
    }
}
registerClass(StorageBuilding);
