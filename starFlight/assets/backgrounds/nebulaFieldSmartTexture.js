import { ige } from "../../../engine/instance.js";
export const nebulaFieldSmartTexture = {
    render: (ctx, entity) => {
        let points = 10, nebs, sfPoint, texture, textureCell, finalPointX, finalPointY, multipleX, multipleY, newType, halfWidth, halfHeight, i;
        const camera = ige.engine._currentCamera;
        if (!camera)
            return;
        if (!entity.data("nebula")) {
            // Create the nebula data object on our entity
            const maxDim = Math.max(entity._bounds2d.x, entity._bounds2d.y);
            // Do we have a default
            if (entity._initialNebula) {
                nebs = entity._initialNebula;
            }
            else {
                // First run so generate some random positions and speeds
                nebs = [];
                for (i = 0; i < points; i++) {
                    nebs[i] = [
                        Math.floor(Math.random() * maxDim * 1.5) - (maxDim * 1.5) / 2,
                        Math.floor(Math.random() * maxDim * 1.5) - (maxDim * 1.5) / 2,
                        0.1 + parseFloat((Math.random() * 0.5).toFixed(1)),
                        Math.ceil(Math.random() * 4),
                        Math.floor(Math.random() * 360) - 180 // rotation
                    ];
                }
            }
            const newNebula = {
                // Set the max dimensions
                maxDim,
                // Assign the different clouds in the nebula
                nebs
            };
            entity.data("nebula", newNebula);
        }
        const nebula = entity.data("nebula");
        // Render nebula
        nebs = nebula.nebs;
        points = nebs.length;
        ctx.translate(-entity._bounds2d.x2, -entity._bounds2d.y2);
        for (i = 0; i < points; i++) {
            ctx.save();
            newType = false;
            sfPoint = nebs[i];
            texture = ige.textures.get("neb" + sfPoint[3]);
            if (!texture.image)
                continue;
            textureCell = texture._cells[1];
            finalPointX = Math.floor(sfPoint[0] - (camera._translate.x * sfPoint[2]));
            finalPointY = Math.floor(sfPoint[1] - (camera._translate.y * sfPoint[2]));
            /*
             multipleX = Math.floor(finalPointX / nebula.maxDim);
             multipleY = Math.floor(finalPointY / nebula.maxDim);

             if (finalPointX + textureCell[2] < 0) {
             // Right side of nebula is off screen to left
             } else if (finalPointX > nebula.maxDim) {
             // Left side of nebula is off screen to right

             }

             if (multipleX != 0) {
             //console.log('x', finalPointX, finalPointX - (nebula.maxDim * multipleX), multipleX);
             finalPointX -= (nebula.maxDim * multipleX);
             }

             if (multipleY != 0) {
             //console.log('y', finalPointX, finalPointY - (nebula.maxDim * multipleY), multipleX);
             finalPointY -= (nebula.maxDim * multipleY);
             }
             */
            //halfWidth = Math.floor(textureCell[2] / 2);
            //halfHeight = Math.floor(textureCell[3] / 2);
            if (finalPointX + textureCell[2] < 0) {
                sfPoint[0] += nebula.maxDim + textureCell[2];
                //sfPoint[1] += nebula.maxDim * 0.5;
                newType = true;
            }
            else if (finalPointX > nebula.maxDim) {
                // Left side of nebula is off screen to right
                sfPoint[0] -= (nebula.maxDim + textureCell[2]);
                //sfPoint[1] -= nebula.maxDim * 1.5;
                newType = true;
            }
            if (finalPointY + textureCell[3] < 0) {
                // Bottom side of nebula is off screen to top
                sfPoint[1] += nebula.maxDim + textureCell[3];
                //sfPoint[0] += nebula.maxDim * 1.5;
                newType = true;
            }
            else if (finalPointY > nebula.maxDim) {
                // Top side of nebula is off screen to bottom
                sfPoint[1] -= (nebula.maxDim + textureCell[3]);
                //sfPoint[0] -= nebula.maxDim * 1.5;
                newType = true;
            }
            /*
             // Draw a point to represent the xy of the nebula draw point
             ctx.strokeStyle = '#ffffff';
             ctx.strokeRect(
             finalPointX + camera._translate.x - 3,
             finalPointY + camera._translate.y - 3,
             6,
             6
             );
             */
            ctx.translate((finalPointX + camera._translate.x), (finalPointY + camera._translate.y));
            ctx.translate((textureCell[2] / 2), (textureCell[3] / 2));
            ctx.rotate(sfPoint[4] * Math.PI / 180);
            ctx.translate(-(textureCell[2] / 2), -(textureCell[3] / 2));
            ctx.drawImage(texture.image, textureCell[0], // texture x
            textureCell[1], // texture y
            textureCell[2], // texture width
            textureCell[3], // texture height
            0, // render x
            0, // render y
            textureCell[2], // render width
            textureCell[3] // render height
            );
            ctx.restore();
        }
    }
};
