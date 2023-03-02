import Ige from "../../../core/Ige";
import IgeEntity from "../../../core/IgeEntity";
import IgeDummyContext from "../../../core/IgeDummyContext";

class IgeBox2dDebugPainter extends IgeEntity {
    classId = "IgeBox2dDebugPainter";
    _entity: IgeEntity;
    _options?: Record<any, any>;

    constructor(ige: Ige, entity: IgeEntity, options?: Record<any, any>) {
        super(ige);

        this._entity = entity;
        this._options = options;
    }

    tick(ctx: CanvasRenderingContext2D | typeof IgeDummyContext) {
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
