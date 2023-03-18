import { IgePoint2d } from "../core/IgePoint2d";
import { IgeSmartTexture } from "../../types/IgeSmartTexture";
import { IgeMountMode } from "../../enums/IgeMountMode";
import { IgeTileMap2d } from "../core/IgeTileMap2d";

export const IgeTileMap2dSmartTexture: IgeSmartTexture = {
	render: (ctx, entity) => {
		const ent = entity as IgeTileMap2d;

		const tileWidth = ent._tileWidth,
			tileHeight = ent._tileHeight,
			bounds2d = ent._bounds2d,
			gridSize = ent._gridSize;

		const x = 0;
		const y = 0;

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

			let index,
				gStart,
				gEnd;

			for (index = 0; index <= gridSize.y; index++) {
				gStart = new IgePoint2d(x, y + tileHeight * index);
				gEnd = new IgePoint2d(gridMaxX, y + tileHeight * index);

				if (ent._mountMode === IgeMountMode.iso) {
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
				gStart = new IgePoint2d(x + tileWidth * index, y);
				gEnd = new IgePoint2d(x + tileWidth * index, gridMaxY);

				if (ent._mountMode === IgeMountMode.iso) {
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
			for (const y in ent.map._mapData) {
				if (ent.map._mapData[y]) {
					for (const x in ent.map._mapData[y]) {
						if (ent.map._mapData[y][x]) {
							// Tile is occupied
							tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);

							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (ent._mountMode === IgeMountMode.flat) {
								// 2d
								ctx.fillRect(tilePoint.x, tilePoint.y, tileWidth, tileHeight);
							}

							if (ent._mountMode === IgeMountMode.iso) {
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
					tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);

					// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
					if (ent._mountMode === IgeMountMode.flat) {
						// 2d
						ctx.fillRect(tilePoint.x, tilePoint.y, tileWidth, tileHeight);
					}

					if (ent._mountMode === IgeMountMode.iso) {
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
			var mousePos = ent.mousePos(),
				mouseTile = ent.mouseToTile(),
				tilePoint,
				text,
				textMeasurement;

			if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < gridSize.x && mouseTile.y < gridSize.y) {
				// Paint the tile the mouse is currently intersecting
				ctx.fillStyle = ent._hoverColor || "#6000ff";
				if (ent._mountMode === IgeMountMode.flat) {
					// 2d
					ctx.fillRect(mouseTile.x * tileWidth, mouseTile.y * tileHeight, tileWidth, tileHeight);
				}

				if (ent._mountMode === IgeMountMode.iso) {
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
}
