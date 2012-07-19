ige = null;
version = '1.1.0';

igeDebug = {
	node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
	level: ['log', 'warning', 'error'],
	stacks: false,
	throwErrors: true,
	trace: {
		setup: false,
		enabled: false,
		match: ''
	}
};

/**
 * Removes the passed item from an array, the opposite of push().
 * @param item
 * @return {*}
 */
Array.prototype.pull = function (item) {
	var index = this.indexOf(item);
	if (index > -1) {
		this.splice(index, 1);
		return index;
	} else {
		return -1;
	}
};

/**
 * Iterates through an array's items and calls the callback method
 * passing each item one by one.
 * @param {Function} callback
 */
Array.prototype.each = function (callback) {
	for (var i = 0; i < this.length; i++) {
		callback(this[i]);
	}
};

/**
 * Calculates the distance from the first point to the second point.
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @return {Number}
 */
Math.distance = function (x1, y1, x2, y2) {
	return Math.sqrt(((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2)));
};

/**
 * Turn off the right-click default behaviour in the browser for the passed element.
 * @param obj
 */
var disableContextMenu = function (obj) {
	if (obj !== null) {
		//this.log('Disabling context menus for ' + obj, 'info');
		obj.oncontextmenu = function () { return false; };
	}
};

/**
 * Adds the indexOf method to all array objects if it does not already exist which
 * would you believe can still happen.
 */
if(!Array.prototype.indexOf){
	Array.prototype.indexOf = function(obj) {
		var i, l = this.length;
		for (i = 0; i < l; i++) {
			if(this[i] === obj){
				return i;
			}
		}
		return -1;
	};
}

/**
 * A cross-browser requestAnimFrame method.
 */
if (typeof(window) !== 'undefined') {
	window.requestAnimFrame = (function(){
		return function(callback, element){
			setTimeout(function () { callback(new Date().getTime()); }, 1000 / 60);
		};
	}());

	/*requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame     ||
		function(callback, element){
			setTimeout(callback, 1000 / 60);
		};
	}());*/
} else {
	requestAnimFrame = function(callback, element){
		setTimeout(callback, 1000 / 60);
	};
}

// Check console method existence
if (typeof(console) === 'object') {
	if (typeof(console.log) === 'function') {
		if (typeof(console.info) === 'undefined') {
			// We have console.log but not console.info so add it as a replica of console.log
			console.info = console.log;
		}

		if (typeof(console.warn) === 'undefined') {
			// We have console.log but not console.warn so add it as a replica of console.log
			console.warn = console.log;
		}
	}
} else {
	// Create dummy console
	console = {
		log: function () {},
		warn: function () {},
		info: function () {},
		error: function () {}
	};
}