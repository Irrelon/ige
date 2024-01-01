import { ige } from "../../../instance";
import { IgeEntity } from "../../../core/IgeEntity";
import { registerClass } from "../../../igeClassStore";
export class IgeBox2dDebugPainter extends IgeEntity {
    classId = "IgeBox2dDebugPainter";
    _entity;
    _options;
    constructor(entity, options) {
        super();
        this._entity = entity;
        this._options = options;
    }
    tick(ctx) {
        if (this._parent && this._parent.isometricMounts()) {
            ctx.scale(1.414, 0.707); // This should be super-accurate now
            ctx.rotate((45 * Math.PI) / 180);
        }
        ige.box2d._world?.DrawDebugData();
        super.tick(ctx);
    }
}
registerClass(IgeBox2dDebugPainter);
