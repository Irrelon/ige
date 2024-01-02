"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
const IgeEntity_1 = require("../../../../engine/core/IgeEntity.js");
const instance_1 = require("../../../../engine/instance.js");
class Target extends IgeEntity_1.IgeEntity {
    constructor() {
        super();
        this.classId = "Target";
        this.texture(instance_1.ige.textures.get("target"))
            .width(50)
            .height(50)
            .mount(instance_1.ige.$("frontScene"));
    }
    update(ctx, tickDelta) {
        if (this._targetEntity) {
            if (this._targetEntity.alive()) {
                this.translateToPoint(this._targetEntity._translate);
            }
            else {
                // Remove the target entity from the target as the target entity
                // is now dead
                this._targetEntity = undefined;
            }
        }
        super.update(ctx, tickDelta);
    }
}
exports.Target = Target;
