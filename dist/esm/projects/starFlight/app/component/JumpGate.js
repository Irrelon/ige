import { isClient } from "../../../../engine/clientServer.js"
import { IgeEntity } from "../../../../engine/core/IgeEntity.js"
import { registerClass } from "../../../../engine/igeClassStore.js"
import { ige } from "../../../../engine/instance.js"
export class JumpGate extends IgeEntity {
    classId = "JumpGate";
    _publicGameData;
    constructor(publicGameData) {
        super();
        this._publicGameData = publicGameData;
        this.layer(0).width(400).height(380);
        if (isClient) {
            this.texture(ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
registerClass(JumpGate);
