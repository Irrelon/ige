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

Object.defineProperty(Object.prototype, 'tween', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Augments all objects with the tween() method. Creates a new IgeTween
 * with the passed parameters that will act upon the object's properties.
 * The returned tween will not start tweening until a call to start() is
 * made.
 * @param {Object} props
 * @param {Number} durationMs
 * @param {Object=} options
 * @return {IgeTween}
 */
Object.prototype.tween = function (props, durationMs, options) {
	var newTween = new IgeTween()
		.targetObj(this)
		.properties(props)
		.duration(durationMs);

	if (options) {
		if (options.beforeTween) { newTween.beforeTween(options.beforeTween); }
		if (options.afterTween) { newTween.afterTween(options.afterTween); }
		if (options.easing) { newTween.easing(options.easing); }
		if (options.startTime) { newTween.startTime(options.startTime); }
	}

	return newTween;
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
	var len = this.length,
		i;

	for (i = 0; i < len; i++) {
		callback(this[i]);
	}
};

/**
 * Iterates through an array's items and calls the callback method
 * passing each item one by one in reverse order.
 * @param {Function} callback
 */
Array.prototype.eachReverse = function (callback) {
	var arrCount = this.length,
		i;

	for (i = arrCount - 1; i >= 0; i--) {
		callback(this[i]);
	}
};

/**
 * Iterates through an array's items and calls the callback method
 * passing each item one by one. Altering the array's structure
 * during the callback method will not affect the iteration of the
 * items.
 *
 * @param {Function} callback
 */
Array.prototype.eachIsolated = function (callback) {
	var arr = [],
		arrCount = arr.length,
		i;

	// Create a copy of the array
	for (i = 0; i < arrCount; i++) {
		arr[i] = this[i];
	}

	// Now iterate the array, passing the copied
	// array value at the index(i). Any changes to
	// "this" will not affect the index(i) values.
	for (i = 0; i < arrCount; i++) {
		callback(arr[i]);
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
 * A cross-browser requestAnimationFrame method.
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