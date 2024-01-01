"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEntity = void 0;
const instance_1 = require("../../../../engine/instance.js");
const clientServer_1 = require("../../../../engine/clientServer.js");
const IgeEntity_1 = require("../../../../engine/core/IgeEntity.js");
const IgeStreamMode_1 = require("../../../../enums/IgeStreamMode.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
class GameEntity extends IgeEntity_1.IgeEntity {
    constructor() {
        super();
        //this.isometric(ige.data("isometric"));
        this.streamMode(IgeStreamMode_1.IgeStreamMode.simple);
        this.streamSections(["transform", "props"]);
        // Define a function that will be called when the
        // mouse cursor moves over one of our entities
        const overFunc = function () {
            this.highlight(true);
            this.drawBounds(true);
            //this.drawBoundsData(true);
        };
        // Define a function that will be called when the
        // mouse cursor moves away from one of our entities
        const outFunc = function () {
            this.highlight(false);
            this.drawBounds(false);
            //this.drawBoundsData(false);
        };
        //this.pointerOver(overFunc);
        //this.pointerOut(outFunc);
    }
    mount(obj) {
        if (clientServer_1.isServer) {
            this.streamProperty("mount", obj.id());
        }
        return super.mount(obj);
    }
    onStreamProperty(propName, propVal) {
        switch (propName) {
            case "mount":
                this.mount(instance_1.ige.$(propVal));
        }
        return this;
    }
}
exports.GameEntity = GameEntity;
(0, igeClassStore_1.registerClass)(GameEntity);
