"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.radarSmartTexture = void 0;
const instance_1 = require("@/engine/instance");
const utils_1 = require("@/engine/utils");
exports.radarSmartTexture = {
    render: function (ctx, entity) {
        if (instance_1.ige.app.playerEntity) {
            const peTranslate = instance_1.ige.app.playerEntity._translate;
            // Draw the background
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#3f3f3f';
            //ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
            //ctx.strokeRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
            // Loop all visible entities and show them
            // on the radar
            let draw, blipRadius;
            const entArray = []; //ige.entities.byIndex;
            let entCount = entArray.length;
            const radarScale = entity._radarScale || 0.05;
            // Limit the draw area to the radar "screen"
            ctx.beginPath();
            ctx.rect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
            ctx.clip();
            // Draw a bunch of grid lines
            ctx.strokeStyle = '#00707a';
            for (let x = 0; x < 3; x++) {
                ctx.beginPath();
                ctx.moveTo(-entity._bounds2d.x2 + (x * 100) - (peTranslate.x * radarScale), -entity._bounds2d.y2);
                ctx.lineTo(-entity._bounds2d.x2 + (x * 100) - (peTranslate.x * radarScale), entity._bounds2d.y);
                ctx.stroke();
            }
            for (let y = 0; y < 3; y++) {
                ctx.beginPath();
                ctx.moveTo(-entity._bounds2d.x2, -entity._bounds2d.y2 + (y * 100) - (peTranslate.y * radarScale));
                ctx.lineTo(entity._bounds2d.x, -entity._bounds2d.y2 + (y * 100) - (peTranslate.y * radarScale));
                ctx.stroke();
            }
            // Move to the center of the draw space
            ctx.translate((entity._bounds2d.x / 2), (entity._bounds2d.y / 2));
            ctx.scale(radarScale, radarScale);
            while (entCount--) {
                const ent = entArray[entCount];
                // Check the entity is renderable
                if (ent._canRender) {
                    // Check the entity is visible
                    if (!ent._hidden) {
                        // Check entity is not mounted to another
                        if (!ent._parentEntity) {
                            draw = false;
                            // Display a radar blip for this entity
                            if (ent._class == 'asteroid') {
                                ctx.fillStyle = '#afafaf';
                                blipRadius = ent._width / 2; // 20
                                draw = true;
                            }
                            if (ent._class == 'ship') {
                                ctx.fillStyle = '#fffc00';
                                blipRadius = ent._width / 2; // 30
                                draw = true;
                            }
                            if (ent._class == 'station') {
                                ctx.fillStyle = '#ea00ff';
                                blipRadius = ent._width / 2; // 60
                                draw = true;
                            }
                            if (draw) {
                                ctx.beginPath();
                                ctx.arc(ent._transform[0] - peTranslate.x, ent._transform[1] - peTranslate.y, blipRadius, 0, utils_1.PI2, true);
                                ctx.closePath();
                                ctx.fill();
                            }
                        }
                    }
                }
            }
        }
    }
};
