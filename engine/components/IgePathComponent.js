/**
 * Handles entity path traversal.
 */
var IgePathComponent = IgeEventingClass.extend({
	classId: 'IgePathComponent',
	componentId: 'path',

	init: function (entity, options) {
		this._entity = entity;
		this._points = [];
		this._speed = 1 / 1000;
		
		this._previousPointFrom = 0;
		this._currentPointFrom = 0;
		this._previousPointTo = 0;
		this._currentPointTo = 0;
		
		// Add the path behaviour to the entity
		entity.addBehaviour('path', this._updateBehaviour, false);
	},

	/**
	 * Gets / sets the tile map that will be used when calculating paths.
	 * @param {IgeTileMap2d} val The tileMap to use for path calculations.
	 * @returns {*}
	 */
	tileMap: function (val) {
		if (val !== undefined) {
			this._tileMap = val;
			return this;
		}
		
		return this._tileMap;
	},
	
	/**
	 * Gets / sets the path finder class instance used to generate paths.
	 * @param {IgePathFinder} val The pathfinder class instance to use to generate paths.
	 * @returns {*}
	 */
	finder: function (val) {
		if (val !== undefined) {
			this._finder = val;
			return this;
		}
		
		return this._finder;
	},

	/**
	 * Gets / sets the dynamic mode enabled flag. If dynamic mode is enabled
	 * then at the end of every path point (reaching a tile along the path)
	 * the path finder will evaluate the path by looking ahead and seeing if
	 * the path has changed (the tiles along the path have now been marked as
	 * cannot path on). If any tile along the path up to the look-ahead value
	 * has been blocked, the path will auto re-calculate to avoid the new block.
	 * 
	 * For dynamic mode to work you need to supply a path-finder instance by
	 * calling .finder(), a tile checker method by calling .tileChecker() and
	 * the number of look-ahead steps by calling .lookAheadSteps(). See the
	 * doc for those methods for usage and required arguments.
	 * @param {Boolean} enable If set to true, enables dynamic mode.
	 * @returns {*}
	 */
	dynamic: function (enable) {
		if (enable !== undefined) {
			this._dynamic = enable;
			return this;
		}
		
		return this._dynamic;
	},

	/**
	 * Gets / sets the tile checker method used when calculating paths.
	 * @param {Function=} val The method to call when checking if a tile is valid
	 * to traverse when calculating paths.
	 * @returns {*}
	 */
	tileChecker: function (val) {
		if (val !== undefined) {
			var self = this;
			
			this._tileChecker = function () { return val.apply(self._entity, arguments); };
			return this;
		}
		
		return this._tileChecker;
	},
	
	lookAheadSteps: function (val) {
		if (val !== undefined) {
			this._lookAheadSteps = val;
			return this;
		}
		
		return this._lookAheadSteps;
	},

	/**
	 * Gets / sets the flag determining if a path can use N, S, E and W movement.
	 * @param {Boolean=} val Set to true to allow, false to disallow.
	 * @returns {*}
	 */
	allowSquare: function (val) {
		if (val !== undefined) {
			this._allowSquare = val;
			return this;
		}
		
		return this._allowSquare;
	},
	
	/**
	 * Gets / sets the flag determining if a path can use NW, SW, NE and SE movement.
	 * @param {Boolean=} val Set to true to allow, false to disallow.
	 * @returns {*}
	 */
	allowDiagonal: function (val) {
		if (val !== undefined) {
			this._allowDiagonal = val;
			return this;
		}
		
		return this._allowDiagonal;
	},

	/**
	 * Clears any existing path points and sets the path the entity will traverse
	 * from start to finish.
	 * @param {Number} fromX The x tile to path from.
	 * @param {Number} fromY The y tile to path from.
	 * @param {Number} fromZ The z tile to path from.
	 * @param {Number} toX The x tile to path to.
	 * @param {Number} toY The y tile to path to.
	 * @param {Number} toZ The z tile to path to.
	 * @param {Boolean=} findNearest If the destination is unreachable, when set to
	 * true this option will allow the pathfinder to return the closest path to the
	 * destination tile.
	 * @returns {*}
	 */
	set: function (fromX, fromY, fromZ, toX, toY, toZ, findNearest) {
		// Clear existing path
		this.clear();
		
		// Create a new path
		var path = this._finder.generate(
			this._tileMap,
			new IgePoint3d(fromX, fromY, fromZ),
			new IgePoint3d(toX, toY, toZ),
			this._tileChecker,
			this._allowSquare,
			this._allowDiagonal,
			findNearest
		);
		
		this.addPoints(path);
		
		return this;
	},
	
	add: function (x, y, z, findNearest) {
		// Get the endPoint of the current path
		var endPoint = this.getEndPoint(),
			shift = true;
		
		if (!endPoint) {
			// There is no existing path, detect current tile position
			endPoint = this._entity._parent.pointToTile(this._entity._translate);
			shift = false;
		}
		
		// Create a new path
		var path = this._finder.generate(
			this._tileMap,
			endPoint,
			new IgePoint3d(x, y, z),
			this._tileChecker,
			this._allowSquare,
			this._allowDiagonal,
			findNearest
		);
		
		if (shift) {
			// Remove the first tile, it's the last one on the list already
			path.shift();
		}
		
		this.addPoints(path);
		
		return this;
	},

	/**
	 * Adds a path array containing path points (IgePoint3d instances) to the points queue.
	 * @param {Array} path An array of path points.
	 * @return {*}
	 */
	addPoints: function (path) {
		if (path !== undefined) {
			// Check the path array has items in it!
			if (path.length) {
				this._points = this._points.concat(path);
				this._calculatePathData();
			} else {
				this.log('Cannot add an empty path to the path queue!', 'warning');
			}
		}

		return this;
	},

	/**
	 * Gets the path node point that the entity is travelling from.
	 * @return {IgePoint3d} A new point representing the travelled from node.
	 */
	getFromPoint: function () {
		return this._points[this._currentPointFrom];
	},

	/**
	 * Gets the path node point that the entity is travelling to.
	 * @return {IgePoint3d} A new point representing the travelling to node.
	 */
	getToPoint: function () {
		return this._points[this._currentPointTo];
	},

	/**
	 * Gets the current direction.
	 * @example #Get the direction of movement along the current path
	 *     // Create an entity and add the path component
	 *     var entity = new IgeEntity()
	 *         .addComponent(IgePathComponent);
	 *     
	 *     // Create a path and add it to the entity
	 *     // ...
	 *     // Now get the current direction
	 *     var direction = entity.path.currentDirection();
	 * @return {String} A string such as N, S, E, W, NW, NE, SW, SE.
	 * If there is currently no direction then the return value is a blank string.
	 */
	getDirection: function () {
		if (!this._finished) {
			var cell = this.getToPoint(),
				dir = '';
			
			if (cell) {
				dir = cell.direction;
				
				if (this._entity._mode === 1) {
					// Convert direction for isometric
					switch (dir) {
						case 'E':
							dir = 'SE';
							break;
						
						case 'S':
							dir = 'SW';
							break;
						
						case 'W':
							dir = 'NW';
							break;
						
						case 'N':
							dir = 'NE';
							break;
						
						case 'NE':
							dir = 'E';
							break;
						
						case 'SW':
							dir = 'W';
							break;
						
						case 'NW':
							dir = 'N';
							break;
						
						case 'SE':
							dir = 'S';
							break;
					}
				}
			}
		} else {
			dir = '';
		}

		return dir;
	},

	/**
	 * Gets / sets the time towards the end of the path when the path
	 * component will emit a "almostComplete" event.
	 * @param {Number=} ms The time in milliseconds to emit the event
	 * on before the end of the path.
	 * @return {*}
	 */
	warnTime: function (ms) {
		if (ms !== undefined) {
			this._warnTime = ms;
			return this;
		}

		return this._warnTime;
	},

	/**
	 * Gets / sets the flag determining if the entity moving along
	 * the path will stop automatically at the end of the path.
	 * @param {Boolean=} val If true, will stop at the end of the path.
	 * @return {*}
	 */
	autoStop: function (val) {
		if (val !== undefined) {
			this._autoStop = val;
			return this;
		}

		return this._autoStop;
	},

	/**
	 * Gets / sets the speed at which the entity will traverse the path in pixels
	 * per second (world space).
	 * @param {Number=} val
	 * @return {*}
	 */
	speed: function (val) {
		if (val !== undefined) {
			this._speed = val / 1000;
			
			if (this._active) {
				this.stop();
				this.start(this._startTime);
			}
			return this;
		}

		return this._speed;
	},

	/**
	 * Starts path traversal.
	 * @param {Number=} startTime The time to start path traversal. Defaults
	 * to new Date().getTime() if no
	 * value is presented.
	 * @return {*}
	 */
	start: function (startTime) {
		if (!this._active) {
			this._active = true;
			this._finished = false;
			this._startTime = startTime || ige._currentTime;
			
			this._calculatePathData();
		} else {
			this._finished = false;
		}
		
		return this;
	},

	/**
	 * Returns the last point of the last path in the path queue.
	 * @return {IgePoint3d}
	 */
	getEndPoint: function () {
		return this._points[this._points.length - 1];
	},

	/**
	 * Pauses path traversal but does not clear the path queue or any path data.
	 * @return {*}
	 */
	pause: function () {
		this._active = false;
		this._paused = true;
		this._pauseTime = ige._currentTime;
		
		this.emit('paused', this._entity);
		return this;
	},

	/**
	 * Clears all path queue and path data.
	 * @return {*}
	 */
	clear: function () {
		if (this._active) {
			this.stop();
		}
		
		this._previousPointFrom = 0;
		this._currentPointFrom = 0;
		this._previousPointTo = 0;
		this._currentPointTo = 0;
		this._points = [];
		
		this.emit('cleared', this._entity);
		return this;
	},
	
	/**
	 * Stops path traversal but does not clear the path
	 * queue or any path data.
	 * @return {*}
	 */
	stop: function () {
		//this.log('Setting pathing as inactive...');
		this._active = false;
		this._finished = true;
		this.emit('stopped', this._entity);
		
		return this;
	},

	/**
	 * Gets / sets the flag determining if the path component
	 * should draw the current path of the entity to the canvas
	 * on each tick. Useful for debugging paths.
	 * @param {Boolean=} val If true, will draw the path.
	 * @return {*}
	 */
	drawPath: function (val) {
		if (val !== undefined) {
			this._drawPath = val;
			
			if (val) {
				this._entity.addBehaviour('path', this._tickBehaviour, true);
			} else {
				this._entity.removeBehaviour('path', true);
			}
			
			return this;
		}

		return this._drawPath;
	},

	/**
	 * Gets / sets the flag that determines if the path that
	 * is drawn gets some added glow effects or not. Pure eye
	 * candy, completely pointless otherwise.
	 * @param {Boolean=} val If true will add glow effects to the path.
	 * @return {*}
	 */
	drawPathGlow: function (val) {
		if (val !== undefined) {
			this._drawPathGlow = val;
			return this;
		}

		return this._drawPathGlow;
	},

	/**
	 * Gets / sets the flag that determines if the path that
	 * is drawn gets some added labels or not.
	 * @param {Boolean=} val If true will draw labels on each path point.
	 * @return {*}
	 */
	drawPathText: function (val) {
		if (val !== undefined) {
			this._drawPathText = val;
			return this;
		}

		return this._drawPathText;
	},
	
	multiplyPoint: function (point) {
		return point.multiply(
			this._entity._parent._tileWidth,
			this._entity._parent._tileHeight,
			1
		);
	},

	dividePoint: function (point) {
		return point.divide(
			this._entity._parent._tileWidth,
			this._entity._parent._tileHeight,
			1
		);
	},
	
	transformPoint: function (point) {
		return new IgePoint3d(
			point.x + this._entity._parent._tileWidth / 2,
			point.y + this._entity._parent._tileHeight / 2,
			point.z
		);
	},

	unTransformPoint: function (point) {
		return new IgePoint3d(
			point.x - this._entity._parent._tileWidth / 2,
			point.y - this._entity._parent._tileHeight / 2,
			point.z
		);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param {CanvasRenderingContext2d} ctx The canvas that is currently being
	 * rendered to.
	 * @private
	 */
	_updateBehaviour: function (ctx) {
		var path = this.path,
			currentTime = ige._currentTime,
			progressTime = currentTime - path._startTime;
		
		// Check if we should be processing paths
		if (path._active && path._totalDistance !== 0 && currentTime >= path._startTime && (progressTime <= path._totalTime || !path._finished)) {
			var distanceTravelled = (path._speed) * progressTime,
				totalDistance = 0,
				pointArr = path._points,
				pointCount = pointArr.length,
				pointIndex,
				pointFrom,
				pointTo,
				newPoint,
				dynamicResult;
			
			// Loop points along the path and determine which points we are traversing between
			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				totalDistance += pointArr[pointIndex]._distanceToNext;
				
				if (totalDistance > distanceTravelled) {
					// Found points we are traversing
					path._finished = false;
					path._currentPointFrom = pointIndex;
					path._currentPointTo = pointIndex + 1;
					pointFrom = pointArr[pointIndex];
					pointTo = pointArr[pointIndex + 1];
					break;
				}
			}
			
			// Check if we have points to traverse between
			if (pointFrom && pointTo) {
				if (path._currentPointFrom !== path._previousPointFrom) {
					// Emit point complete
					path.emit('pointComplete', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y, pointArr[path._currentPointFrom].x, pointArr[path._currentPointFrom].y]);
				}
				
				// Check if we are in dynamic mode and if so, ensure our path is still valid
				if (path._dynamic) {
					dynamicResult = path._processDynamic(pointFrom, pointTo, pointArr[pointCount - 1]);
					if (dynamicResult === true) {
						// Re-assign the points to the new ones that the dynamic path
						// spliced into our points array
						pointFrom = pointArr[path._currentPointFrom];
						pointTo = pointArr[path._currentPointTo];
						
						path.emit('pathRecalculated', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y, pointArr[path._currentPointFrom].x, pointArr[path._currentPointFrom].y]);
					}
					
					if (dynamicResult === -1) {
						// Failed to find a new dynamic path
						path._finished = true;
					}
				}
				
				// Calculate position along vector between the two points
				newPoint = path._positionAlongVector(
					pointFrom,
					pointTo,
					path._speed,
					pointFrom._deltaTimeToNext - (pointFrom._absoluteTimeToNext - progressTime)
				);
				
				newPoint = path.multiplyPoint(newPoint);
				newPoint = path.transformPoint(newPoint);
				
				// Translate the entity to the new path point
				this.translateToPoint(newPoint);
				
				path._previousPointFrom = path._currentPointFrom;
				path._previousPointTo = path._currentPointTo;
			} else {
				pointTo = pointArr[pointCount - 1];
				
				newPoint = path.multiplyPoint(pointTo);
				newPoint = path.transformPoint(newPoint);
				
				path._previousPointFrom = pointCount - 1;
				path._previousPointTo = pointCount - 1;
				path._currentPointFrom = pointCount - 1;
				path._currentPointTo = pointCount - 1;
				
				this.translateToPoint(newPoint);
				
				path._finished = true;
				path.emit('pathComplete', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y]);
			}
		} else if(path._active && path._totalDistance == 0 && !path._finished) {
			path._finished = true;
		}
	},
	
	_processDynamic: function (pointFrom, pointTo, destinationPoint) {
		var self = this,
			tileMapData,
			tileCheckData,
			newPathPoints;
		
		// We are in dynamic mode, check steps ahead to see if they
		// have been blocked or not
		tileMapData = self._tileMap.map._mapData;
		tileCheckData = tileMapData[pointTo.y] && tileMapData[pointTo.y][pointTo.x] ? tileMapData[pointTo.y][pointTo.x] : null;
		
		if (!self._tileChecker(tileCheckData, pointTo.x, pointTo.y, null, null, null, true)) {
			// The new destination tile is blocked, recalculate path
			newPathPoints = self._finder.generate(
				self._tileMap,
				new IgePoint3d(pointFrom.x, pointFrom.y, pointFrom.z),
				new IgePoint3d(destinationPoint.x, destinationPoint.y, destinationPoint.z),
				self._tileChecker,
				self._allowSquare,
				self._allowDiagonal,
				false
			);
			
			if (newPathPoints.length) {
				self.replacePoints(self._currentPointFrom, self._points.length - self._currentPointFrom, newPathPoints);
				return true;
			} else {
				// Cannot generate valid path, delete this path
				self.emit('dynamicFail', [this, new IgePoint3d(pointFrom.x, pointFrom.y, pointFrom.z), new IgePoint3d(destinationPoint.x, destinationPoint.y, destinationPoint.z)]);
				self.clear();
				
				return -1;
			}
		}
		
		return false;
	},
	
	_calculatePathData: function () {
		var totalDistance = 0,
			startPoint,
			pointFrom,
			pointTo,
			i;


		if(this._currentPointFrom === 0) {
			// always set the first point to be the current position
			startPoint = this._entity._translate.clone();
			startPoint = this.unTransformPoint(startPoint);
			startPoint = this.dividePoint(startPoint);
			this._points[0] = startPoint;
		}

		// Calculate total distance to travel
		for (i = 1; i < this._points.length; i++) {
			pointFrom = this._points[i - 1];
			pointTo = this._points[i];
			pointFrom._distanceToNext = Math.distance(pointFrom.x, pointFrom.y, pointTo.x, pointTo.y);
			
			totalDistance += Math.abs(pointFrom._distanceToNext);
			
			pointFrom._deltaTimeToNext = pointFrom._distanceToNext / this._speed;
			pointFrom._absoluteTimeToNext = totalDistance / this._speed;
		}
		
		this._totalDistance = totalDistance;
		this._totalTime = totalDistance / this._speed;
		
		return this;
	},

	/**
	 * Replaces a number of points in the current queue with the new points passed.
	 * @param {Number} fromIndex The from index.
	 * @param {Number} replaceLength The number of points to replace.
	 * @param {Array} newPoints The array of new points to insert.
	 */
	replacePoints: function (fromIndex, replaceLength, newPoints) {
		var args = [fromIndex, replaceLength].concat(newPoints);
		this._points.splice.apply(this._points, args);
		this._calculatePathData();
	},
	
	_tickBehaviour: function (ctx) {
		if (ige.isClient) {
			var self = this.path,
				entity = this,
				currentPath = self._points,
				oldTracePathPoint,
				tracePathPoint,
				pathPointIndex,
				tempPathText;
			
			if (currentPath.length) {
				if (currentPath && self._drawPath) {
					// Draw the current path
					ctx.save();
	
					oldTracePathPoint = undefined;
	
					for (pathPointIndex = 0; pathPointIndex < currentPath.length; pathPointIndex++) {
						ctx.strokeStyle = '#0096ff';
						ctx.fillStyle = '#0096ff';
						
						tracePathPoint = new IgePoint3d(
							currentPath[pathPointIndex].x,
							currentPath[pathPointIndex].y,
							currentPath[pathPointIndex].z
						);
						
						tracePathPoint = self.multiplyPoint(tracePathPoint);
						tracePathPoint = self.transformPoint(tracePathPoint);
						
						if (entity._parent._mountMode === 1) {
							tracePathPoint = tracePathPoint.toIso();
						}
	
						if (!oldTracePathPoint) {
							// The starting point of the path
							ctx.beginPath();
							ctx.arc(tracePathPoint.x, tracePathPoint.y, 5, 0, Math.PI*2, true);
							ctx.closePath();
							ctx.fill();
						} else {
							// Not the starting point
							if (self._drawPathGlow) {
								ctx.globalAlpha = 0.1;
								for (var k = 3; k >= 0 ; k--) {
									ctx.lineWidth = (k + 1) * 4 - 3.5;
									ctx.beginPath();
									ctx.moveTo(oldTracePathPoint.x, oldTracePathPoint.y);
									ctx.lineTo(tracePathPoint.x, tracePathPoint.y);
									
									if (pathPointIndex < self._currentPointTo) {
										ctx.strokeStyle = '#666666';
										ctx.fillStyle = '#333333';
									}
									if (k === 0) {
										ctx.globalAlpha = 1;
									}
	
									ctx.stroke();
								}
							} else {
								ctx.beginPath();
								ctx.moveTo(oldTracePathPoint.x, oldTracePathPoint.y);
								ctx.lineTo(tracePathPoint.x, tracePathPoint.y);
								
								if (pathPointIndex < self._currentPointTo) {
									ctx.strokeStyle = '#666666';
									ctx.fillStyle = '#333333';
								}
	
								ctx.stroke();
							}
	
							if (pathPointIndex === self._currentPointTo) {
								ctx.save();
								ctx.fillStyle = '#24b9ea';
								ctx.fillRect(tracePathPoint.x - 5, tracePathPoint.y - 5, 10, 10);
								
								if (self._drawPathText) {
									ctx.fillStyle = '#eade24';
				
									if (self._drawPathGlow) {
										// Apply shadow to the text
										ctx.shadowOffsetX = 1;
										ctx.shadowOffsetY = 2;
										ctx.shadowBlur    = 4;
										ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
									}
				
									tempPathText = 'Entity: ' + entity.id();
									ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 16);
				
									tempPathText = 'Point (' + currentPath[pathPointIndex].x + ', ' + currentPath[pathPointIndex].y + ')';
									ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 28);
									
									tempPathText = 'Abs (' + Math.floor(entity._translate.x) + ', ' + Math.floor(entity._translate.y) + ')';
									ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 40);
								}
								
								ctx.restore();
							} else {
								ctx.fillRect(tracePathPoint.x - 2.5, tracePathPoint.y - 2.5, 5, 5);
							}
						}
	
						oldTracePathPoint = tracePathPoint;
					}
					
					ctx.restore();
				}
			}
		}
	},

	getPreviousPoint: function (val) {
		return this._points[this._currentPointFrom - val];
	},
	
	getNextPoint: function (val) {
		return this._points[this._currentPointTo + val];
	},

	/**
	 * Calculates the position of the entity along a vector based on the speed
	 * of the entity and the delta time.
	 * @param {IgePoint3d} p1 Vector start point
	 * @param {IgePoint3d} p2 Vector end point
	 * @param {Number} speed Speed along the vector
	 * @param {Number} deltaTime The time between the last update and now.
	 * @return {IgePoint3d}
	 * @private
	 */
	_positionAlongVector: function (p1, p2, speed, deltaTime) {
		var newPoint,
			p1X = p1.x,
			p1Y = p1.y,
			p2X = p2.x,
			p2Y = p2.y,
			deltaX = (p2X - p1X),
			deltaY = (p2Y - p1Y),
			magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
			normalisedX = deltaX / magnitude,
			normalisedY = deltaY / magnitude;
		
		if (deltaX !== 0 || deltaY !== 0) {
			newPoint = new IgePoint3d(
				p1X + (normalisedX * (speed * deltaTime)),
				p1Y + (normalisedY * (speed * deltaTime)),
				0
			);
		} else {
			newPoint = new IgePoint3d(0, 0, 0);
		}

		return newPoint;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathComponent; }