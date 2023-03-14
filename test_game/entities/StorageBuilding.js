import { registerClass } from "../../engine/services/igeClassStore.js";
import { Square } from "./base/Square.js";
export class StorageBuilding extends Square {
    constructor() {
        super();
        this.classId = "StorageBuilding";
    }
    streamCreateData() {
        return [];
    }
}
registerClass(StorageBuilding);
