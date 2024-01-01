"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetScreen = void 0;
const instance_1 = require("@/engine/instance");
exports.targetScreen = {
    render: function (ctx, entity) {
        const lockEntity = instance_1.ige.entities.read('lock');
        const targetEntity = lockEntity._targetEntity;
        if (targetEntity) {
            ctx.strokeStyle = '#282828';
            ctx.strokeRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
            // Move to entity x center
            ctx.translate(entity._bounds2d.x / 2, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('TARGET DATA', 0, 10);
            ctx.textAlign = 'left';
            if (!targetEntity.name) {
                targetEntity.name = 'UNKNOWN';
            }
            ctx.fillText('NAME: ' + targetEntity.name.toUpperCase(), -(entity._bounds2d.x / 2) + 10, 30);
            ctx.fillText('DIST: ' + (parseInt(lockEntity._distance)) + 'km', -(entity._bounds2d.x / 2) + 10, 45);
            ctx.fillText('CLASS: ' + targetEntity._class.toUpperCase(), -(entity._bounds2d.x / 2) + 10, 60);
            ctx.fillText('CORDS: ' + Math.floor(targetEntity._transform[0]) + ', ' + Math.floor(targetEntity._transform[1]), -(entity._bounds2d.x / 2) + 10, 75);
            ctx.fillText('ID: ' + targetEntity.id.toUpperCase(), -(entity._bounds2d.x / 2) + 10, 90);
        }
    }
};