"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.video = void 0;
exports.video = {
    render: function (ctx, entity) {
        if (entity._videoElement) {
            ctx.drawImage(entity._videoElement, 0, 0, 400, 300, 0, 0, 200, 150);
        }
    }
};
