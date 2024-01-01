"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCuboidSmartTexture = void 0;
exports.IgeCuboidSmartTexture = {
    render: (ctx, entity) => {
        const poly = entity.bounds3dPolygon();
        ctx.strokeStyle = "#a200ff";
        poly.render(ctx);
    }
};
