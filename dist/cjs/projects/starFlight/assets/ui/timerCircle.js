"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerCircle = void 0;
exports.timerCircle = {
	render: function (ctx, entity) {
		if (entity._timerColor && entity._timerValue) {
			const percentage = entity._timerValue;
			const degrees = percentage * 360.0;
			const radians = degrees * (Math.PI / 180);
			ctx.rect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
			ctx.clip();
			ctx.beginPath();
			ctx.strokeStyle = entity._timerColor;
			ctx.fillStyle = entity._timerColor;
			ctx.arc(0, 0, entity._bounds2d.x2 + 10, 0, radians, false);
			ctx.lineWidth = 20;
			ctx.lineTo(0, 0);
			ctx.closePath();
			ctx.fill();
		}
	}
};
