import { registerClass } from "../../engine/igeClassStore.js";
import { Flag } from "./base/Flag.js";
export class FlagBuilding extends Flag {
    constructor() {
        super();
        this.classId = "FlagBuilding";
        this.layer(1);
        this.data("glowSize", 30);
        //this.data("glowIntensity", 1);
        if (this.isometric()) {
            this.bounds3d(10, 10, 20);
        }
    }
}
registerClass(FlagBuilding);
