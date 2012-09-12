var IgeInterpolatorExtension = {
	/**
	 * Calculates the current value based on the current time along
	 * the value range.
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

		return totalValue * timeRatio + startValue;
	}
};