var IgeTileMap2dSmartTexture = {
	render: function (ctx, entity) {
		var tileWidth = entity._tileWidth,
			tileHeight = entity._tileHeight,
			bounds2d = entity.bounds2d(),
			gridSize = entity._gridSize,
			x = 0, y = 0;
		
		/*ctx.save();
		var triggerPoly = entity.tileMapHitPolygon();
		
		ctx.strokeStyle = '#00ff00';
		ctx.fillStyle = '#ff99f4';
		
		if (entity._processTriggerHitTests()) {
			ctx.fillStyle = '#ff26e8';
		}
		
		if (entity._mountMode === 0) {
			ctx.translate(bounds2d.x2, bounds2d.y2);
		}
		
		if (entity._mountMode === 1) {
			ctx.translate(-entity._translate.x, -entity._translate.y);
			triggerPoly.render(ctx, true);
		}
		
		//
		ctx.restore();*/
		
		if (entity._drawGrid) {
			ctx.strokeStyle = entity._gridColor;
			var gridMaxX = x + tileWidth * gridSize.x,
				gridMaxY = y + tileHeight * gridSize.y,
				index,
				gStart,
				gEnd;
			
			x = 0;
			y = 0;
	
			for (index = 0; index <= gridSize.y; index++) {
				gStart = new IgePoint2d(x, y + (tileHeight * index));
				gEnd = new IgePoint2d(gridMaxX, y + (tileHeight * index));
	
				if (entity._mountMode === 1) {
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
				gStart = new IgePoint2d(x + (tileWidth * index), y);
				gEnd = new IgePoint2d(x + (tileWidth * index), gridMaxY);
	
				if (entity._mountMode === 1) {
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
		
		if (entity._highlightOccupied) {
			ctx.fillStyle = '#ff0000';
			for (y in entity.map._mapData) {
				if (entity.map._mapData[y]) {
					for (x in entity.map._mapData[y]) {
						if (entity.map._mapData[y][x]) {
							// Tile is occupied
							tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);

							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (entity._mountMode === 0) {
								// 2d
								ctx.fillRect(
									tilePoint.x,
									tilePoint.y,
									tileWidth,
									tileHeight
								);
							}

							if (entity._mountMode === 1) {
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

		if (entity._highlightTileRect) {
			ctx.fillStyle = '#e4ff00';
			for (y = entity._highlightTileRect.y; y < entity._highlightTileRect.y + entity._highlightTileRect.height; y++) {
				for (x = entity._highlightTileRect.x; x < entity._highlightTileRect.x + entity._highlightTileRect.width; x++) {
					// Tile is occupied
					tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);

					// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
					if (entity._mountMode === 0) {
						// 2d
						ctx.fillRect(
							tilePoint.x,
							tilePoint.y,
							tileWidth,
							tileHeight
						);
					}

					if (entity._mountMode === 1) {
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

		if (entity._drawMouse) {
			// Get mouse position
			var mousePos = entity.mousePos(),
				mouseTile = entity.mouseToTile(),
				tilePoint,
				text,
				textMeasurement;
			
			if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < gridSize.x && mouseTile.y < gridSize.y) {
				// Paint the tile the mouse is currently intersecting
				ctx.fillStyle = entity._hoverColor || '#6000ff';
				if (entity._mountMode === 0) {
					// 2d
					ctx.fillRect(
						(mouseTile.x * tileWidth),
						(mouseTile.y * tileHeight),
						tileWidth,
						tileHeight
					);
				}
	
				if (entity._mountMode === 1) {
					// iso
					tilePoint = mouseTile
						.clone()
						.thisMultiply(tileWidth, tileHeight, 0)
						.thisToIso();
					
					tilePoint.y += tileHeight / 2;
	
					ctx.beginPath();
					ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
					ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
					ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
					ctx.fill();
				}
				
				if (entity._drawMouseData) {
					text = 'Tile X: ' + mouseTile.x + ' Y: ' + mouseTile.y;
					textMeasurement = ctx.measureText(text);
					ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
					ctx.fillRect(Math.floor(mousePos.x - textMeasurement.width / 2 - 5), Math.floor(mousePos.y - 40), Math.floor(textMeasurement.width + 10), 14);
					ctx.fillStyle = '#ffffff';
					ctx.fillText(text, Math.floor(mousePos.x - textMeasurement.width / 2), Math.floor(mousePos.y - 30));
				}
			}
		}
	}
};