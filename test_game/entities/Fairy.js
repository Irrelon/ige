import { Rotator } from "./Rotator.js";
import { isClient } from "../../engine/services/clientServer.js";
import { textures } from "../services/textures.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Fairy extends Rotator {
    constructor(speed) {
        super(speed);
        this.classId = "Fairy";
        if (isClient) {
            this.texture(textures.getTextureById("fairy"));
        }
    }
    streamCreateData(allGood = false) {
        return [this._rSpeed];
    }
}
registerClass(Fairy);
