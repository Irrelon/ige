import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { IgeEntity } from "../../../engine/core/IgeEntity.js";
export class JumpGate extends IgeEntity {
    constructor(publicGameData = {}) {
        super();
        this.classId = "JumpGate";
        this._publicGameData = publicGameData;
        this.layer(0)
            .width(400)
            .height(380);
        if (isClient) {
            this.texture(ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateData() {
        return this._publicGameData;
    }
}
