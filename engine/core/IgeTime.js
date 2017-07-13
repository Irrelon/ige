"use strict";

var appCore = require('irrelon-appcore');

appCore.module('igeTime', function () {
	var IgeTime = function () {
		this._tickStart = 0;
		this._lastTick = 0;
		this._tickTime = 'NA'; // The time the tick took to process
		this._updateTime = 'NA'; // The time the tick update section took to process
		this._renderTime = 'NA'; // The time the tick render section took to process
		this._tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._dpf = 0;
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of achieved frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._currentTime = 0; // The current engine time
	};
	
	return new IgeTime();
});