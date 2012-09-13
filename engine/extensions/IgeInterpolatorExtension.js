var IgeInterpolatorExtension = {
	/**
	 * Calculates the current value based on the time along the
	 * value range.
	 * @param startValue The value that the
	 * @param endValue
	 * @param startTime
	 * @param currentTime
	 * @param endTime
	 * @return {Number}
	 */
	interpolateValue: function (startValue, endValue, startTime, currentTime, endTime) {
		var totalValue = endValue - startValue,
			totalTime = endTime - startTime,
			deltaTime = totalTime - (currentTime - startTime),
			timeRatio = deltaTime / totalTime;

		return endValue - (totalValue * timeRatio);
	},

	_processInterpolate: function (renderTime, maxLerp) {
		// Set the maximum lerp to 200 if none is present
		if (!maxLerp) { maxLerp = 200; }

		var maxLerpSquared = maxLerp * maxLerp,
			previousData,
			nextData,
			timeStream = this._timeStream,
			dataDelta,
			offsetDelta,
			currentTime,
			previousPosition,
			nextPosition,
			previousAngle,
			nextAngle,
			dist,
			currentPosition,
			currentAngle,
			i = 1;

		// Find the point in the time stream that is
		// closest to the render time and assign the
		// previous and next data points
		while (timeStream[i]) {
			if (timeStream[i][0] >= renderTime) {
				// We have previous and next data points from the
				// time stream so store them
				previousData = timeStream[i - 1];
				nextData = timeStream[i];
				break;
			}
			i++;
		}

		// Check if we have some data to use
		if (!nextData && !previousData) {
			// No in-time data was found, check for lagging data
			if (timeStream.length > 2) {
				if (timeStream[timeStream.length - 1][0] < renderTime) {
					// Lagging data is available, use that
					previousData = timeStream[timeStream.length - 2];
					nextData = timeStream[timeStream.length - 1];
					timeStream.shift();
					this.emit('entityInterpolationLag');
				}
			}
		} else {
			// We have some new data so clear the old data
			timeStream.splice(0, i - 1);
		}

		// If we have data to use
		if (nextData && previousData) {
			// Calculate the delta times
			dataDelta = nextData[0] - previousData[0];
			offsetDelta = renderTime - previousData[0];

			// Calculate the current time between the two data points
			currentTime = offsetDelta / dataDelta;

			// Clamp the current time from 0 to 1
			if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }

			// Set variables up to store the previous and next data
			previousPosition = {x: previousData[1]._transform[0], y: previousData[1]._transform[1]};
			nextPosition = {x:nextData[1]._transform[0], y:nextData[1]._transform[1]};
			previousAngle = previousData[1]._transform[6];
			nextAngle = nextData[1]._transform[6];

			// Calculate the squared distance between the previous point and next point
			dist = this.distanceSquared(previousPosition.x, previousPosition.y, nextPosition.x, nextPosition.y);

			// Check that the distance is not higher than the maximum lerp and if higher,
			// set the current time to 1 to snap to the next position immediately
			if (dist > maxLerpSquared) { currentTime = 1; }

			// Interpolate the entity position by multiplying the Delta times T, and adding the previous position
			currentPosition = {};
			currentPosition.x = ( (nextPosition.x - previousPosition.x) * currentTime ) + previousPosition.x;
			currentPosition.y = ( (nextPosition.y - previousPosition.y) * currentTime ) + previousPosition.y;
			currentAngle = ( (nextAngle - previousAngle) * currentTime ) + previousAngle;

			// Now actually transform the entity
			this.translate(entity, currentPosition.x, currentPosition.y);
			this.rotate(entity, currentAngle);

			// Record the last time we updated the entity so we can disregard any updates
			// that arrive and are before this timestamp (not applicable in TCP but will
			// apply if we ever get UDP in websockets)
			entity._lastUpdate = new Date().getTime();
		}
	}
};