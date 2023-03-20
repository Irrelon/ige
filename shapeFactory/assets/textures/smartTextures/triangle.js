const triangle = {
    render: function (ctx, entity) {
        ctx.beginPath();
        ctx.moveTo(-entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.lineTo(0, -entity._bounds2d.y2);
        ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = entity.data("glowColor");
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fill();
    }
};
export default triangle;
