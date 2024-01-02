export const tab = {
    render: function (ctx, entity) {
        ctx.lineWidth = 1;
        // Move to bottom of parent
        ctx.fillStyle = "#00080a";
        ctx.strokeStyle = "#04b7f9";
        switch (entity._tabOptions.position) {
            case "top":
                ctx.moveTo(-entity._bounds2d.x2, entity._bounds2d.y2 - 1);
                ctx.lineTo(-entity._bounds2d.x2 + 10, -entity._bounds2d.y2);
                ctx.lineTo(entity._bounds2d.x2 - 10, -entity._bounds2d.y2);
                ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2 - 1);
                break;
            case "bottom":
                ctx.moveTo(-entity._bounds2d.x2, -entity._bounds2d.y2 + 1);
                ctx.lineTo(-entity._bounds2d.x2 + 10, entity._bounds2d.y2);
                ctx.lineTo(entity._bounds2d.x2 - 10, entity._bounds2d.y2);
                ctx.lineTo(entity._bounds2d.x2, -entity._bounds2d.y2 + 1);
                break;
        }
        ctx.fill();
        ctx.stroke();
    }
};
