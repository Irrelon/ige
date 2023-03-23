import { registerClass } from "../../engine/igeClassStore.js";
import { Flag } from "./base/Flag.js";
export class FlagBuilding extends Flag {
    constructor() {
        super(...arguments);
        this.classId = "FlagBuilding";
    }
}
registerClass(FlagBuilding);
