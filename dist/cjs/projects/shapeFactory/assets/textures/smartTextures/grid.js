"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gridSmartTexture = void 0;
exports.gridSmartTexture = {
    render: function (ctx, entity) {
        ctx.fillStyle = entity.data("fillColor") || "#ffffff";
        ctx.shadowColor = entity.data("glowColor");
        ctx.shadowBlur = entity.data("glowSize");
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        const spacing = entity.spacing;
        //const glowIntensity = entity.data("glowIntensity");
        for (let x = -entity._bounds2d.x; x < entity._bounds2d.x; x += spacing) {
            for (let y = -entity._bounds2d.y; y < entity._bounds2d.y; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
                // for (let i = 0; i < glowIntensity || 0; i++) {
                // 	ctx.fill();
                // }
            }
        }
    }
};
