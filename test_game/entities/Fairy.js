import { Rotator } from "./Rotator.js";
import { isClient } from "../../engine/services/clientServer.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
import { ige } from "../../engine/instance.js";
export class Fairy extends Rotator {
    constructor(speed) {
        super(speed);
        this.classId = "Fairy";
        if (isClient) {
            this.texture(ige.textures.get("fairy"));
        }
    }
    streamCreateData(allGood = false) {
        return [this._rSpeed];
    }
}
registerClass(Fairy);
