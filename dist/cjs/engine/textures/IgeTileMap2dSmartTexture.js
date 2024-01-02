"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTileMap2dSmartTexture = void 0;
const IgePoint2d_1 = require("../core/IgePoint2d");
const IgeMountMode_1 = require("../../enums/IgeMountMode.js");
exports.IgeTileMap2dSmartTexture = {
	render: (ctx, entity) => {
		const ent = entity;
		const tileWidth = ent._tileWidth,
			tileHeight = ent._tileHeight,
			bounds2d = ent._bounds2d,
			gridSize = ent._gridSize;
		let x = 0,
			y = 0,
			tilePoint;
		/*ctx.save();
        var triggerPoly = ent.tileMapHitPolygon();

        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#ff99f4';

        if (ent._processTriggerHitTests()) {
            ctx.fillStyle = '#ff26e8';
        }

        if (ent._mountMode === IgeMountMode.flat) {
            ctx.translate(bounds2d.x2, bounds2d.y2);
        }

        if (ent._mountMode === IgeMountMode.iso) {
            ctx.translate(-ent._translate.x, -ent._translate.y);
            triggerPoly.render(ctx, true);
        }

        //
        ctx.restore();*/
		if (ent._drawGrid) {
			ctx.strokeStyle = ent._gridColor;
			const gridMaxX = x + tileWidth * gridSize.x;
			const gridMaxY = y + tileHeight * gridSize.y;
			let index, gStart, gEnd;
			for (index = 0; index <= gridSize.y; index++) {
				gStart = new IgePoint2d_1.IgePoint2d(x, y + tileHeight * index);
				gEnd = new IgePoint2d_1.IgePoint2d(gridMaxX, y + tileHeight * index);
				if (ent._mountMode === IgeMountMode_1.IgeMountMode.iso) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}
				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}
			for (index = 0; index <= gridSize.x; index++) {
				gStart = new IgePoint2d_1.IgePoint2d(x + tileWidth * index, y);
				gEnd = new IgePoint2d_1.IgePoint2d(x + tileWidth * index, gridMaxY);
				if (ent._mountMode === IgeMountMode_1.IgeMountMode.iso) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}
				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}
		}
		if (ent._highlightOccupied) {
			ctx.fillStyle = "#ff0000";
			for (y of ent.map._mapData.keys()) {
				if (ent.map._mapData[y]) {
					for (x of ent.map._mapData[y].keys()) {
						if (ent.map._mapData[y][x]) {
							// Tile is occupied
							tilePoint = new IgePoint2d_1.IgePoint2d(tileWidth * x, tileHeight * y);
							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (ent._mountMode === IgeMountMode_1.IgeMountMode.flat) {
								// 2d
								ctx.fillRect(tilePoint.x, tilePoint.y, tileWidth, tileHeight);
							}
							if (ent._mountMode === IgeMountMode_1.IgeMountMode.iso) {
								// iso
								tilePoint.thisToIso();
								ctx.beginPath();
								ctx.moveTo(tilePoint.x, tilePoint.y);
								ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y + tileHeight / 2);
								ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight);
								ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y + tileHeight / 2);
								ctx.lineTo(tilePoint.x, tilePoint.y);
								ctx.fill();
							}
						}
					}
				}
			}
		}
		if (ent._highlightTileRect) {
			ctx.fillStyle = "#e4ff00";
			for (y = ent._highlightTileRect.y; y < ent._highlightTileRect.y + ent._highlightTileRect.height; y++) {
				for (x = ent._highlightTileRect.x; x < ent._highlightTileRect.x + ent._highlightTileRect.width; x++) {
					// Tile is occupied
					tilePoint = new IgePoint2d_1.IgePoint2d(tileWidth * x, tileHeight * y);
					// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
					if (ent._mountMode === IgeMountMode_1.IgeMountMode.flat) {
						// 2d
						ctx.fillRect(tilePoint.x, tilePoint.y, tileWidth, tileHeight);
					}
					if (ent._mountMode === IgeMountMode_1.IgeMountMode.iso) {
						// iso
						tilePoint.thisToIso();
						ctx.beginPath();
						ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
						ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
						ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
						ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
						ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
						ctx.fill();
					}
				}
			}
		}
		if (ent._drawMouse) {
			// Get mouse position
			const mousePos = ent.mousePos(),
				mouseTile = ent.mouseToTile();
			let text, textMeasurement;
			if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < gridSize.x && mouseTile.y < gridSize.y) {
				// Paint the tile the mouse is currently intersecting
				ctx.fillStyle = ent._hoverColor || "#6000ff";
				if (ent._mountMode === IgeMountMode_1.IgeMountMode.flat) {
					// 2d
					ctx.fillRect(mouseTile.x * tileWidth, mouseTile.y * tileHeight, tileWidth, tileHeight);
				}
				if (ent._mountMode === IgeMountMode_1.IgeMountMode.iso) {
					// iso
					tilePoint = mouseTile.clone().thisMultiply(tileWidth, tileHeight, 0).thisToIso();
					tilePoint.y += tileHeight / 2;
					ctx.beginPath();
					ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
					ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
					ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
					ctx.fill();
				}
				if (ent._drawMouseData) {
					text = "Tile X: " + mouseTile.x + " Y: " + mouseTile.y;
					textMeasurement = ctx.measureText(text);
					ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
					ctx.fillRect(
						Math.floor(mousePos.x - textMeasurement.width / 2 - 5),
						Math.floor(mousePos.y - 40),
						Math.floor(textMeasurement.width + 10),
						14
					);
					ctx.fillStyle = "#ffffff";
					ctx.fillText(text, Math.floor(mousePos.x - textMeasurement.width / 2), Math.floor(mousePos.y - 30));
				}
			}
		}
	}
};
