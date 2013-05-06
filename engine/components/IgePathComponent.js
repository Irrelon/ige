/**
 * Handles entity path traversal.
 */
var IgePathComponent = IgeEventingClass.extend({
	classId: 'IgePathComponent',
	componentId: 'path',

	init: function (entity, options) {
		this._entity = entity;
		this._transform = entity.transform;

		// Setup the array that will hold our active paths
		this._paths = []; // Holds a list of paths to traverse
		this._currentPathIndex = -1; // Holds the current path we are traversing
		this._traverseDirection = 0; // The direction to traverse the path (0 = normal, 1 = reverse order)
		this._targetCellIndex = -1; // Holds the target cell of the current path - where in the path we are pathing to
		this._targetCellArrivalTime = 0; // Holds the timestamp that we will arrive at the target cell
		this._active = false; // Determines if we should be traversing paths or not
		this._paused = false;
		this._warnTime = 0;
		this._autoStop = true;
		this._startTime = null;
		this._speed = 0.1;

		// Add the path behaviour to the entity
		entity.addBehaviour('path', this._updateBehaviour, false);
		entity.addBehaviour('path', this._tickBehaviour, true);
	},

	/**
	 * Adds a path array containing path points (IgePoint instances)
	 * to the path queue.
	 * @param {Array} path
	 * @return {*}
	 */
	add: function (path) {
		if (path !== undefined) {
			// Check the path array has items in it!
			if (path.length) {
				//this.log('Adding path to queue... (active: ' + this._active + ')');
				this._paths.push(path);
			} else {
				this.log('Cannot add an empty path to the path queue!', 'warning');
			}
		}

		return this._entity;
	},

	/**
	 * Gets / sets the current path index that the pathing
	 * system is traversing.
	 * @param {Number=} index
	 * @return {*}
	 */
	current: function (index) {
		if (index !== undefined) {
			this._currentPathIndex = index;
			return this._entity;
		}

		return this._currentPathIndex;
	},

	/**
	 * Gets the path node point that the entity is travelling from.
	 * @return {IgePoint} A new point representing the travelled from node.
	 */
	previousTargetPoint: function () {
		if (this._paths.length) {
			var tpI = this._targetCellIndex > 0 ? this._targetCellIndex - 1 : this._targetCellIndex,
				entParent = this._entity._parent,
				targetCell = this._paths[this._currentPathIndex][tpI];

			return targetCell.mode === 0 ? new IgePoint(targetCell.x * entParent._tileWidth, targetCell.y * entParent._tileHeight, 0) : targetCell.clone();
		}
	},

	/**
	 * Gets the path node point that the entity is travelling to.
	 * @return {IgePoint} A new point representing the travelling to node.
	 */
	currentTargetPoint: function () {
		if (this._paths.length) {
			var entParent = this._entity._parent,
				targetCell = this._paths[this._currentPathIndex][this._targetCellIndex];

			return targetCell.mode === 0 ? new IgePoint(targetCell.x * entParent._tileWidth, targetCell.y * entParent._tileHeight, 0) : targetCell.clone();
		}
	},

	previousTargetCell: function () {
		if (this._paths.length) {
			var tpI = this._targetCellIndex > 0 ? this._targetCellIndex - 1 : this._targetCellIndex;

			return this._paths[this._currentPathIndex][tpI];
		}
	},

	currentTargetCell: function () {
		if (this._paths.length) {
			return this._paths[this._currentPathIndex][this._targetCellIndex];
		}
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
	currentDirection: function () {
		var cell = this.currentTargetCell(),
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
			return this._entity;
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
			return this._entity;
		}

		return this._autoStop;
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
			return this._entity;
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
			return this._entity;
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
			return this._entity;
		}

		return this._drawPathText;
	},

	/**
	 * Gets / sets the speed at which the entity will
	 * traverse the path.
	 * @param {Number=} val
	 * @return {*}
	 */
	speed: function (val) {
		if (val !== undefined) {
			this._speed = val;
			return this._entity;
		}

		return this._speed;
	},

	/**
	 * Starts path traversal.
	 * @param {Number=} startTime The time to start path
	 * traversal. Defaults to new Date().getTime() if no
	 * value is presented.
	 * @return {*}
	 */
	start: function (startTime) {
		// Check that we are not already active
		if (!this._active) {
			// Check that the parent has tileWidth and height properties
			if (this._entity._parent && (!this._entity._parent._tileWidth || !this._entity._parent._tileHeight)) {
				this.log('Cannot start path traversal on entity because it is not mounted to a tile or texture map so it\'s parent does not have _tileWidth and _tileHeight property values. Either set these values or mount to a map.', 'error');
			} else {
				/* DEXCLUDE */
				this.log('Starting path traversal...');
				/* DEXCLUDE */
				// Check we have some paths to traverse!
				if (this._paths.length) {
					// If we don't have a current path index, set it to zero
					if (this._currentPathIndex === -1) { this._currentPathIndex = 0; }
					if (this._targetCellIndex === -1) { this._targetCellIndex = 0; }
	
					// If we weren't passed a start time, assign it the current time
					if (startTime === undefined) {
						startTime = ige._currentTime;
					}
	
					if (this._paused) {
						// Bring the arrival time of the target cell forward to take
						// into account the time we were paused
						this._targetCellArrivalTime += startTime - this._pauseTime;
						this._paused = false;
					}
	
					this._startTime = startTime;
					this._currentTime = this._startTime;
	
					// Set pathing to active
					this._active = true;
					this.emit('started', this._entity);
					/* DEXCLUDE */
					this.log('Traversal started (active: ' + this._active + ')');
					/* DEXCLUDE */
				} else {
					this.log('Cannot start path because no paths have been added!', 'warning');
				}
			}
		}

		return this._entity;
	},

	/**
	 * Returns the last point of the last path in the
	 * path queue.
	 * @return {IgePoint}
	 */
	endPoint: function () {
		var paths = this._paths,
			pathCount = this._paths.length,
			points,
			pointCount;

		if (pathCount) {
			// We have paths so figure out the last point
			// of the last path and return it
			points = paths[pathCount - 1];
			pointCount = points.length;

			return points[pointCount - 1];
		} else {
			// No paths so return a null point
			return null;
		}
	},

	/**
	 * Pauses path traversal but does not clear the path
	 * queue or any path data.
	 * @return {*}
	 */
	pause: function () {
		this._active = false;
		this._paused = true;
		this._pauseTime = ige._currentTime;
		this.emit('paused', this._entity);
		return this._entity;
	},

	/**
	 * Stops path traversal but does not clear the path
	 * queue or any path data.
	 * @return {*}
	 */
	stop: function () {
		//this.log('Setting pathing as inactive...');
		this._active = false;
		this.emit('stopped', this._entity);
		return this._entity;
	},

	/**
	 * Clears all path queue and path data.
	 * @return {*}
	 */
	clear: function () {
		if (this._active) {
			this.stop();
		}
		this._paths = [];

		this._currentPathIndex = -1;
		this._targetCellIndex = -1;
		this._targetCellArrivalTime = 0;

		this.emit('cleared', this._entity);

		return this._entity;
	},

	/**
	 * The behaviour method executed each tick.
	 * @param {CanvasRenderingContext2d} ctx The canvas that is currently being
	 * rendered to.
	 * @private
	 */
	_updateBehaviour: function (ctx) {
		// TODO: Fix the distance, time, speed issue so that if we have a large tick delta, it carries on the path instead of extending the current to target cell
		if (this.path._active) {
			var self = this.path,
				currentPath = self._paths[self._currentPathIndex],
				currentPosition = this._translate,
				targetCell = currentPath[self._targetCellIndex],
				targetPoint,
				newPosition,
				distanceBetweenP1AndP2,
				oldTracePathPoint,
				tracePathPoint,
				pathPointIndex,
				tempCurrentPath,
				tempCurrentPathIndex,
				tempPathText;

			self._currentTime = ige._currentTime;//ige._tickDelta;

			if (targetCell) {
				if (targetCell.mode === 0) {
					targetPoint = {
						x: targetCell.x * this._parent._tileWidth,
						y: targetCell.y * this._parent._tileHeight
					};
				} else {
					targetPoint = {
						x: targetCell.x,
						y: targetCell.y
					};
				}

				if (currentPath) {
					if (self._currentTime < self._targetCellArrivalTime && (targetPoint.x !== currentPosition.x || targetPoint.y !== currentPosition.y)) {
						newPosition = self._positionAlongVector(
							currentPosition,
							targetPoint,
							self._speed,
							ige._tickDelta
						);
						
						this.translateTo(newPosition.x, newPosition.y, currentPosition.z);
					} else {
						// We are at the target cell, move to the next cell
						self.emit('pointComplete', this);
						self._targetCellIndex++;

						// Check we are being sane!
						if (!currentPath[self._targetCellIndex]) {
							//self.log('Path complete...');

							// Make sure we're exactly on the target
							this.translateTo(targetPoint.x, targetPoint.y, currentPosition.z);

							self.emit('pathComplete', this);

							// No more cells, go to next path
							self._targetCellIndex = 0;
							self._currentPathIndex++;
							//self.log('Advancing to next path...');

							if (!self._paths[self._currentPathIndex]) {
								//self.log('No more paths, resting now.');
								// No more paths, reset and exit
								self.clear();
								self.emit('traversalComplete', this);

								return false;
							}
						}

						// Set the new target cell's arrival time
						currentPath = self._paths[self._currentPathIndex];
						targetCell = currentPath[self._targetCellIndex];
						if(targetCell.mode===0){
							targetPoint = {x: targetCell.x * this._parent._tileWidth, y: targetCell.y * this._parent._tileHeight};
						}else{
							targetPoint = targetCell.clone();
						}
						distanceBetweenP1AndP2 = Math.distance(currentPosition.x, currentPosition.y, targetPoint.x, targetPoint.y);

						self._targetCellArrivalTime = self._currentTime + (distanceBetweenP1AndP2 / self._speed);
					}
				} else {
					// No path so stop pathing!
					self.stop();
				}


			}
		}
	},
	
	_tickBehaviour: function (ctx) {
		if (!ige.isServer) {
			this.path._drawPathToCtx(this, ctx);
		}
	},

	_drawPathToCtx: function (entity, ctx) {
		if (this._paths.length) {
			var self = this,
				currentPath,
				oldTracePathPoint,
				tracePathPoint,
				pathPointIndex,
				tempCurrentPath,
				tempCurrentPathIndex,
				tempPathText;

			if (self._active) {
				currentPath = self._paths[self._currentPathIndex]
			} else {
				currentPath = self._paths[0];
			}

			if (currentPath) {
				if (self._drawPath) {
					// Draw the current path
					ctx.save();
					tempCurrentPathIndex = 0;

					while (self._paths[tempCurrentPathIndex]) {
						tempCurrentPath = self._paths[tempCurrentPathIndex];
						oldTracePathPoint = undefined;

						for (pathPointIndex = 0; pathPointIndex < tempCurrentPath.length; pathPointIndex++) {
							if (tempCurrentPathIndex === self._currentPathIndex) {
								ctx.strokeStyle = '#0096ff';
								ctx.fillStyle = '#0096ff';
							} else {
								ctx.strokeStyle = '#fff000';
								ctx.fillStyle = '#fff000';
							}
							
							if(tempCurrentPath[pathPointIndex].mode===0){
								if (entity._parent.isometricMounts()) {
									tracePathPoint = new IgePoint((tempCurrentPath[pathPointIndex].x * entity._parent._tileWidth), (tempCurrentPath[pathPointIndex].y * entity._parent._tileHeight), 0).toIso();
								} else {
									tracePathPoint = new IgePoint((tempCurrentPath[pathPointIndex].x * entity._parent._tileWidth), (tempCurrentPath[pathPointIndex].y * entity._parent._tileHeight), 0);
								}
							}else{
								if (entity._parent.isometricMounts()) {
									tracePathPoint = tempCurrentPath[pathPointIndex].clone().toIso();
								} else {
									tracePathPoint = tempCurrentPath[pathPointIndex].clone();
								}
							}

							if (!oldTracePathPoint) {
								// The starting point of the path
								ctx.beginPath();
								ctx.arc(tracePathPoint.x, tracePathPoint.y, 5, 0, Math.PI*2, true);
								ctx.closePath();

								if (tempCurrentPathIndex < self._currentPathIndex) {
									ctx.fillStyle = '#666666';
								}

								ctx.fill();

								if (self._drawPathText) {
									ctx.save();
									ctx.fillStyle = '#eade24';

									if (self._drawPathGlow) {
										// Apply shadow to the text
										ctx.shadowOffsetX = 1;
										ctx.shadowOffsetY = 2;
										ctx.shadowBlur    = 4;
										ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
									}

									tempPathText = 'Entity: ' + entity.id();
									ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y - 22);

									tempPathText = 'Path ' + tempCurrentPathIndex + ' (' + tempCurrentPath[pathPointIndex].x + ', ' + tempCurrentPath[pathPointIndex].y + ')';
									ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y - 10);
									ctx.restore();
								}
							} else {
								// Not the starting point
								if (self._drawPathGlow) {
									ctx.globalAlpha = 0.1;
									for (var k = 3; k >= 0 ; k--) {
										ctx.lineWidth = (k + 1) * 4 - 3.5;
										ctx.beginPath();
										ctx.moveTo(oldTracePathPoint.x, oldTracePathPoint.y);
										ctx.lineTo(tracePathPoint.x, tracePathPoint.y);
										if (tempCurrentPathIndex < self._currentPathIndex || (tempCurrentPathIndex === self._currentPathIndex && pathPointIndex < self._targetCellIndex)) {
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
									if (tempCurrentPathIndex < self._currentPathIndex || (tempCurrentPathIndex === self._currentPathIndex && pathPointIndex < self._targetCellIndex)) {
										ctx.strokeStyle = '#666666';
										ctx.fillStyle = '#333333';
									}

									ctx.stroke();
								}

								if (tempCurrentPathIndex === self._currentPathIndex && pathPointIndex === self._targetCellIndex) {
									ctx.save();
									ctx.translate(tracePathPoint.x, tracePathPoint.y);
									ctx.rotate(45 * Math.PI / 180);
									ctx.translate(-tracePathPoint.x, -tracePathPoint.y);
									ctx.fillStyle = '#d024ea';
									ctx.fillRect(tracePathPoint.x - 5, tracePathPoint.y - 5, 10, 10);
									ctx.restore();
								} else {
									ctx.fillRect(tracePathPoint.x - 2.5, tracePathPoint.y - 2.5, 5, 5);
								}
							}

							oldTracePathPoint = tracePathPoint;
						}

						tempCurrentPathIndex++;
					}
					ctx.restore();
				}
			}
		}
	},

	/**
	 * Calculates the position of the entity along a vector
	 * based on the speed of the entity and the delta time.
	 * @param {IgePoint} p1 Vector starting point
	 * @param {IgePoint} p2 Vevtor ending point
	 * @param {Number} speed Speed along the vector
	 * @param {Number} deltaTime The time between the last upadte and now.
	 * @return {IgePoint}
	 * @private
	 */
	_positionAlongVector: function (p1, p2, speed, deltaTime) {
		var newPoint = new IgePoint(0, 0, 0),
			deltaY = (p2.y - p1.y),
			deltaX = (p2.x - p1.x),
			distanceBetweenP1AndP2 = Math.distance(p1.x, p1.y, p2.x, p2.y),
			xVelocity = speed * deltaX / distanceBetweenP1AndP2,
			yVelocity = speed * deltaY / distanceBetweenP1AndP2;

		if (distanceBetweenP1AndP2 > 0) {
			newPoint.x = p1.x + (xVelocity * deltaTime);
			newPoint.y = p1.y + (yVelocity * deltaTime);
		}

		return newPoint;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathComponent; }