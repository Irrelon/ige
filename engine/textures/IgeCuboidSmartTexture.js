const IgeCuboidSmartTexture = {
    render: (ige, ctx, entity) => {
        const poly = entity.bounds3dPolygon();
        ctx.strokeStyle = "#a200ff";
        poly.render(ctx);
    }
};
export default IgeCuboidSmartTexture;
