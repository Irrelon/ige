import { ige } from "../../../instance.js";
import { IgeEntity } from "../../../core/IgeEntity.js";
import { registerClass } from "../../../igeClassStore.js";
export class IgeBox2dDebugPainter extends IgeEntity {
    constructor(entity, options) {
        super();
        this.classId = "IgeBox2dDebugPainter";
        this._entity = entity;
        this._options = options;
    }
    tick(ctx) {
        var _a;
        if (this._parent && this._parent.isometricMounts()) {
            ctx.scale(1.414, 0.707); // This should be super-accurate now
            ctx.rotate((45 * Math.PI) / 180);
        }
        (_a = ige.box2d._world) === null || _a === void 0 ? void 0 : _a.DrawDebugData();
        super.tick(ctx);
    }
}
registerClass(IgeBox2dDebugPainter);
