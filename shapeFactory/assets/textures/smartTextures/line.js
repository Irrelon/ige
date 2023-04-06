import { IgePoint3d } from "../../../../engine/core/IgePoint3d.js";
export const lineSmartTexture = {
    render: function (ctx, entity) {
        ctx.beginPath();
        if (entity.isometric()) {
            const p1 = new IgePoint3d(-entity._bounds2d.x2, -entity._bounds2d.y2, 0).toIso();
            const p2 = new IgePoint3d(entity._bounds2d.x2, entity._bounds2d.y2, 0).toIso();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        }
        else {
            ctx.moveTo(-entity._bounds2d.x2, -entity._bounds2d.y2);
            ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.shadowColor = entity.data("glowColor");
        ctx.shadowBlur = entity.data("glowSize");
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.stroke();
        for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
            ctx.stroke();
        }
    }
};
