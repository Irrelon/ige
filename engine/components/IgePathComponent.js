var IgePathComponent = IgeClass.extend({
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
		this._warnTime = 0;
		this._autoStop = true;
		this._startTime = null;
		this._speed = 0.1;

		// Add the path behaviour to the entity
		entity.addBehaviour('path', this._behaviour);
	},

	add: function (path) {
		if (path !== undefined) {
			//this.log('Adding path to queue... (active: ' + this._active + ')');
			this._paths.push(path);
		}

		return this._entity;
	},

	current: function (index) {
		if (index !== undefined) {
			this._currentPathIndex = index;
			return this._entity;
		}

		return this._currentPathIndex;
	},

	warnTime: function (val) {
		if (val !== undefined) {
			this._warnTime = val;
			return this._entity;
		}

		return this._warnTime;
	},

	autoStop: function (val) {
		if (val !== undefined) {
			this._autoStop = val;
			return this._entity;
		}

		return this._autoStop;
	},

	start: function (startTime) {
		// Check that we are not already active
		if (!this._active) {
			//this.log('Starting path traversal...');
			// Check we have some paths to traverse!
			if (this._paths.length) {
				// If we don't have a current path index, set it to zero
				if (this._currentPathIndex === -1) { this._currentPathIndex = 0; }
				if (this._targetCellIndex === -1) { this._targetCellIndex = 0; }

				// If we weren't passed a start time, assign it the current time
				if (startTime !== undefined) {
					this._startTime = startTime;
				} else {
					this._startTime = new Date().getTime();
				}

				// Set pathing to active
				this._active = true;
				//this.log('Traversal started (active: ' + this._active + ')');
			} else {
				//this.log('Cannot start path because no paths have been added!', 'warning');
			}
		}

		return this._entity;
	},

	stop: function () {
		//this.log('Setting pathing as inactive...');
		this._active = false;
		return this._entity;
	},

	clear: function () {
		this.stop();
		this._paths = [];

		this._currentPathIndex = -1;
		this._targetCellIndex = -1;
		this._targetCellArrivalTime = 0;

		return this._entity;
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		// TODO: Fix the distance, time, speed issue so that if we have a large tick delta, it carries on the path instead of extending the current to target cell
		if (this.path._active) {
			var self = this.path,
				currentPath = self._paths[self._currentPathIndex],
				currentPosition = this._translate,
				targetCell = currentPath[self._targetCellIndex],
				targetPoint,
				newPosition,
				distanceBetweenP1AndP2,
				currentTime = new Date().getTime();

			if (targetCell) {
				targetPoint = {x: targetCell.x * this._parent._tileWidth, y: targetCell.y * this._parent._tileHeight}

				if (currentPath) {
					if (currentTime < self._targetCellArrivalTime && (targetPoint.x !== currentPosition.x || targetPoint.y !== currentPosition.y)) {
						newPosition = self._positionAlongVector(currentPosition, targetPoint, self._speed, ige.tickDelta);
						this.translateTo(newPosition.x, newPosition.y, currentPosition.z);
					} else {
						// We are at the target cell, move to the next cell
						self._targetCellIndex++;

						// Check we are being sane!
						if (!currentPath[self._targetCellIndex]) {
							//self.log('Path complete...');

							// Make sure we're exactly on the target
							this.translateTo(targetPoint.x, targetPoint.y, currentPosition.z);

							// No more cells, go to next path
							self._targetCellIndex = 0;
							self._currentPathIndex++;
							//self.log('Advancing to next path...');

							if (!self._paths[self._currentPathIndex]) {
								//self.log('No more paths, resting now.');
								// No more paths, reset and exit
								self.clear();

								return false;
							}
						}

						// Set the new target cell's arrival time
						currentPath = self._paths[self._currentPathIndex];
						targetCell = currentPath[self._targetCellIndex];
						targetPoint = {x: targetCell.x * this._parent._tileWidth, y: targetCell.y * this._parent._tileHeight};
						distanceBetweenP1AndP2 = Math.distance(currentPosition.x, currentPosition.y, targetPoint.x, targetPoint.y);

						self._targetCellArrivalTime = new Date().getTime() + (distanceBetweenP1AndP2 / self._speed);
					}
				} else {
					// No path so stop pathing!
					self.stop();
				}
			}
		}
	},

	_positionAlongVector: function (p1, p2, speed, time) {
		var newPoint = new IgePoint(0, 0, 0),
			deltaY = (p2.y - p1.y),
			deltaX = (p2.x - p1.x),
			distanceBetweenP1AndP2 = Math.distance(p1.x, p1.y, p2.x, p2.y),
			xVelocity = speed * deltaX / distanceBetweenP1AndP2,
			yVelocity = speed * deltaY / distanceBetweenP1AndP2;

		if (distanceBetweenP1AndP2 > 0) {
			newPoint.x = p1.x + (xVelocity * time);
			newPoint.y = p1.y + (yVelocity * time);
		}

		return newPoint;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathComponent; }