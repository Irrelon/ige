export const infoWindow = {
    render: function (ctx, entity) {
        ctx.translate(-entity._bounds2d.x2, -entity._bounds2d.y2);
        ctx.lineWidth = 1;
        ctx.fillStyle = '#00080a';
        ctx.strokeStyle = entity._windowGradient;
        ctx.rect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
        ctx.fill();
        ctx.stroke();
    }
};
