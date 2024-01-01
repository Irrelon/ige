import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { registerClass } from "@/engine/igeClassStore";
export class JumpGate extends IgeEntity {
    classId = "JumpGate";
    _publicGameData;
    constructor(publicGameData) {
        super();
        this._publicGameData = publicGameData;
        this.layer(0)
            .width(400)
            .height(380);
        if (isClient) {
            this.texture(ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
registerClass(JumpGate);
