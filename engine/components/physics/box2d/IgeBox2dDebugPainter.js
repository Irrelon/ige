import { ige } from "../../../instance";
import { IgeEntity } from "../../../core/IgeEntity";
import { registerClass } from "../../../services/igeClassStore";
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
        (_a = ige.engine.components.box2d._world) === null || _a === void 0 ? void 0 : _a.DrawDebugData();
        super.tick(ctx);
    }
}
registerClass(IgeBox2dDebugPainter);
