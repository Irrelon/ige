export const IgeCuboidSmartTexture = {
    render: (ctx, entity) => {
        const poly = entity.bounds3dPolygon();
        ctx.strokeStyle = "#a200ff";
        poly.render(ctx);
    }
};
