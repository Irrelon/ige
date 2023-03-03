import IgeEntity from "../../../core/IgeEntity.js";
class IgeBox2dDebugPainter extends IgeEntity {
    constructor(ige, entity, options) {
        super(ige);
        this.classId = "IgeBox2dDebugPainter";
        this._entity = entity;
        this._options = options;
    }
    tick(ctx) {
        if (this._parent && this._parent.isometricMounts() === 1) {
            ctx.scale(1.414, 0.707); // This should be super-accurate now
            ctx.rotate((45 * Math.PI) / 180);
        }
        this._entity.box2d._world.DrawDebugData();
        super.tick(ctx);
        //IgeObject.prototype.tick.call(this, ctx);
    }
}
export default IgeBox2dDebugPainter;
