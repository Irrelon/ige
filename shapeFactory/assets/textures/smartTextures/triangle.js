import { fillColorByResourceType } from "../../../services/resource.js";
export const triangleSmartTexture = {
    render: function (ctx, entity) {
        ctx.beginPath();
        ctx.moveTo(-entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.lineTo(0, -entity._bounds2d.y2);
        ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.fillStyle = entity.data("fillColor") || "#ffffff";
        ctx.shadowColor = entity.data("glowColor");
        ctx.shadowBlur = entity.data("glowSize");
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fill();
        for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
            ctx.fill();
        }
        const buildingEntity = entity;
        if (buildingEntity._produces) {
            ctx.beginPath();
            ctx.fillStyle = fillColorByResourceType[buildingEntity._produces];
            ctx.arc(0, 0, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
};
