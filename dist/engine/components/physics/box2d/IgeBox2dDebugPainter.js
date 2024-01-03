import { ige } from "../../../../export/exports.js"
import { IgeEntity } from "../../../../export/exports.js"
import { registerClass } from "../../../../export/exports.js"
// TODO: Check if this is still supported with the new version of Box2d we are using. Does DrawDebugData() need calling?
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
        // TODO: This should use something like this.m_world.SetDebugDraw(g_debugDraw); instead now, where g_debugDraw is a Draw instance
        // @ts-ignore
        ige.box2d._world?.DrawDebugData();
        super.tick(ctx);
    }
}
registerClass(IgeBox2dDebugPainter);
