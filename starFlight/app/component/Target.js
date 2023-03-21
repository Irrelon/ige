import { ige } from "../../../engine/instance.js";
import { IgeEntity } from "../../../engine/core/IgeEntity.js";
export class Target extends IgeEntity {
    constructor() {
        super();
        this.classId = "Target";
        this.texture(ige.textures.get("target"))
            .width(50)
            .height(50)
            .mount(ige.$("frontScene"));
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
