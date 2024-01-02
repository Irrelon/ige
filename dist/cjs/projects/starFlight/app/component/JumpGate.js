"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JumpGate = void 0;
const clientServer_1 = require("../../../../engine/clientServer.js");
const IgeEntity_1 = require("../../../../engine/core/IgeEntity.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const instance_1 = require("../../../../engine/instance.js");
class JumpGate extends IgeEntity_1.IgeEntity {
    constructor(publicGameData) {
        super();
        this.classId = "JumpGate";
        this._publicGameData = publicGameData;
        this.layer(0).width(400).height(380);
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
exports.JumpGate = JumpGate;
(0, igeClassStore_1.registerClass)(JumpGate);
