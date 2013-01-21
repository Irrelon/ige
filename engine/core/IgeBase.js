/************************/
/* Isogenic Game Engine */
/************************/
ige = null;
igeVersion = '1.1.0';
igeClassStore = {};

igeConfig = {
	debug: {
		_enabled: true,
		_node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
		_level: ['log', 'warning', 'error'],
		_stacks: true,
		_throwErrors: true,
		_timing: true,
		enabled: function (val) {
			if (val !== undefined) {
				this._enabled = val;
	
				if (!val) {
					this._timing = false;
	
					// Check if the engine exists
					if (ige) {
						// Turn off stats display in the engine
						ige.showStats(0);
					}
				}
	
				return this;
			}
	
			return this._enabled;
		}
	}
};

if (igeConfig.debug._node) {
	igeConfig.debug._util = require('util');
}

/**
 * Make property non-enumerable.
 */
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
 * Make property non-enumerable.
 */
Object.defineProperty(Object.prototype, 'theSameAs', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Augments all objects with the theSameAs() method. Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj The object to compare this one to.
 * @return {Boolean}
 */
Object.prototype.theSameAs = function (obj) {
	return JSON.stringify(this) === JSON.stringify(obj);
};

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'clone', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Clones the array and returns a new non-referenced
 * array.
 * @return {*}
 */
Array.prototype.clone = function () {
	var i, newArray = [];
	for (i in this) {
		if (this.hasOwnProperty(i)) {
			if (this[i] instanceof Array) {
				newArray[i] = this[i].clone();
			} else {
				newArray[i] = this[i];
			}
		}
	}

	return newArray;
};

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'pull', {
	enumerable:false,
	writable:true,
	configurable:true
});

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
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'each', {
	enumerable:false,
	writable:true,
	configurable:true
});

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
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'eachReverse', {
	enumerable:false,
	writable:true,
	configurable:true
});

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
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'destroyAll', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
Array.prototype.destroyAll = function () {
	var arrCount = this.length,
		i;

	for (i = arrCount - 1; i >= 0; i--) {
		if (typeof(this[i].destroy) === 'function') {
			this[i].destroy();
		}
	}
};

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Array.prototype, 'eachIsolated', {
	enumerable:false,
	writable:true,
	configurable:true
});

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
 * Make property non-enumerable.
 */
Object.defineProperty(Math, 'PI180', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Stores a pre-calculated PI / 180 value.
 * @type {Number}
 */
Math.PI180 = Math.PI / 180;

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Math, 'PI180R', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Stores a pre-calculated 180 / PI value.
 * @type {Number}
 */
Math.PI180R = 180 / Math.PI;

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Math, 'radians', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Converts degrees to radians.
 * @param {Number} degrees
 * @return {Number} radians
 */
Math.radians = function (degrees) {
	return degrees * Math.PI180;
};

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Math, 'degrees', {
	enumerable:false,
	writable:true,
	configurable:true
});

/**
 * Converts radians to degrees.
 * @param {Number} radians
 * @return {Number} degrees
 */
Math.degrees = function (radians) {
	return radians * Math.PI180R;
};

/**
 * Make property non-enumerable.
 */
Object.defineProperty(Math, 'distance', {
	enumerable:false,
	writable:true,
	configurable:true
});

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

if (typeof(CanvasRenderingContext2D) !== 'undefined') {
	// Extend the canvas context to add some helper methods
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(CanvasRenderingContext2D.prototype, 'circle', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	Object.defineProperty(CanvasRenderingContext2D.prototype, 'strokeCircle', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillCircle', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	CanvasRenderingContext2D.prototype.circle = function (x, y, radius) {
		this.arc(x, y, radius, 0, 2 * Math.PI, false);
	};

	CanvasRenderingContext2D.prototype.strokeCircle = function (x, y, radius) {
		this.save();
		this.beginPath();
		this.arc(x, y, radius, 0, 2 * Math.PI, false);
		this.stroke();
		this.restore();
	};

	CanvasRenderingContext2D.prototype.fillCircle = function (x, y, radius) {
		this.save();
		this.beginPath();
		this.arc(x, y, radius, 0, 2 * Math.PI, false);
		this.fill();
		this.restore();
	};
}

if (typeof(ImageData) !== 'undefined') {
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(ImageData.prototype, 'pixelAt', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	/**
	 * Augments the canvas context getImageData() object "ImageData" with the
	 * pixelAt() method. Gets the pixel color data for the given pixel at the
	 * x, y co-ordinates specified.
	 * @param {Number} x The x co-ordinate of the pixel.
	 * @param {Number} y The y co-ordinate of the pixel.
	 * @return {Object} An object containing the pixel color data in properties
	 * {r, g, b, a}.
	 */
	ImageData.prototype.pixelAt = function (x, y) {
		var data = this.data,
			pixelStart = (y * this.width * 4) + (x * 4);

		return {
			r: data[pixelStart],
			g: data[pixelStart + 1],
			b: data[pixelStart + 2],
			a: data[pixelStart + 3]
		};
	};

	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(ImageData.prototype, 'isTransparent', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	/**
	 * Augments the canvas context getImageData() object "ImageData" with the
	 * isTransparent() method. Determines if the pixel at the passed x, y is
	 * fully transparent or not.
	 * @param {Number} x The x co-ordinate of the pixel.
	 * @param {Number} y The y co-ordinate of the pixel.
	 * @return {Boolean} True if fully transparent, false if not.
	 */
	ImageData.prototype.isTransparent = function (x, y) {
		var data = this.data,
			pixelStart = (y * this.width * 4) + (x * 4);

		return data[pixelStart + 3] === 0;
	};

	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(ImageData.prototype, 'makeTransparent', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	/**
	 * Augments the canvas context getImageData() object "ImageData" with the
	 * makeTransparent() method. Makes the pixel at the passed x, y fully
	 * transparent.
	 * @param {Number} x The x co-ordinate of the pixel.
	 * @param {Number} y The y co-ordinate of the pixel.
	 */
	ImageData.prototype.makeTransparent = function (x, y) {
		var data = this.data,
			pixelStart = (y * this.width * 4) + (x * 4);

		data[pixelStart + 3] = 0;
	};
}

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
 * would you believe can still happen even in 2012!
 */
if(!Array.prototype.indexOf){
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'indexOf', {
		enumerable:false,
		writable:true,
		configurable:true
	});

	/**
	 * Get the index of the passed item.
	 * @param {*} obj The item to find the index for.
	 * @return {Number} The index of the passed item or -1 if not found.
	 */
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

if (typeof(window) !== 'undefined') {
	/**
	 * A cross-browser/platform requestAnimationFrame method.
	 */
	/*window.requestAnimFrame = (function(){
		return function(callback, element){
			setTimeout(function () { callback(new Date().getTime()); }, 1000 / 60);
		};
	}());*/

	requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame     ||
		function(callback, element){
			setTimeout(function () { callback(new Date().getTime()); }, 1000 / 60);
		};
	}());
} else {
	/**
	 * A cross-browser/platform requestAnimationFrame method.
	 */
	requestAnimFrame = (function(){
		return function(callback, element){
			setTimeout(function () { callback(new Date().getTime()); }, 1000 / 60);
		};
	}());
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

// Add cycle.js
/*
 cycle.js
 2012-07-18

 Public Domain.

 NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

 This code should be minified before deployment.
 See http://javascript.crockford.com/jsmin.html

 USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
 NOT CONTROL.
 */

/*jslint evil: true, regexp: true */

/*members $ref, apply, call, decycle, hasOwnProperty, length, prototype, push,
 retrocycle, stringify, test, toString
 */

if (typeof JSON.decycle !== 'function') {
	JSON.decycle = function decycle(object) {
		'use strict';

// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form
//      {$ref: PATH}
// where the PATH is a JSONPath string that locates the first occurrence.
// So,
//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));
// produces the string '[{"$ref":"$"}]'.

// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child member or
// property.

		var objects = [],   // Keep a reference to each unique object or array
			paths = [];     // Keep the path to each unique object or array

		return (function derez(value, path) {

// The derez recurses through the object, producing the deep copy.

			var i,          // The loop counter
				name,       // Property name
				nu;         // The new object or array

			switch (typeof value) {
				case 'object':

// typeof null === 'object', so get out if this value is not really an object.

					if (!value) {
						return null;
					}

// If the value is an object or array, look to see if we have already
// encountered it. If so, return a $ref/path object. This is a hard way,
// linear search that will get slower as the number of unique objects grows.

					for (i = 0; i < objects.length; i += 1) {
						if (objects[i] === value) {
							return {$ref: paths[i]};
						}
					}

// Otherwise, accumulate the unique value and its path.

					objects.push(value);
					paths.push(path);

// If it is an array, replicate the array.

					if (Object.prototype.toString.apply(value) === '[object Array]') {
						nu = [];
						for (i = 0; i < value.length; i += 1) {
							nu[i] = derez(value[i], path + '[' + i + ']');
						}
					} else {

// If it is an object, replicate the object.

						nu = {};
						for (name in value) {
							if (Object.prototype.hasOwnProperty.call(value, name)) {
								nu[name] = derez(value[name],
									path + '[' + JSON.stringify(name) + ']');
							}
						}
					}
					return nu;
				case 'number':
				case 'string':
				case 'boolean':
					return value;
			}
		}(object, '$'));
	};
}


if (typeof JSON.retrocycle !== 'function') {
	JSON.retrocycle = function retrocycle($) {
		'use strict';

// Restore an object that was reduced by decycle. Members whose values are
// objects of the form
//      {$ref: PATH}
// are replaced with references to the value found by the PATH. This will
// restore cycles. The object will be mutated.

// The eval function is used to locate the values described by a PATH. The
// root object is kept in a $ variable. A regular expression is used to
// assure that the PATH is extremely well formed. The regexp contains nested
// * quantifiers. That has been known to have extremely bad performance
// problems on some browsers for very long strings. A PATH is expected to be
// reasonably short. A PATH is allowed to belong to a very restricted subset of
// Goessner's JSONPath.

// So,
//      var s = '[{"$ref":"$"}]';
//      return JSON.retrocycle(JSON.parse(s));
// produces an array containing a single element which is the array itself.

		var px =
			/^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

		(function rez(value) {

// The rez function walks recursively through the object looking for $ref
// properties. When it finds one that has a value that is a path, then it
// replaces the $ref object with a reference to the value that is found by
// the path.

			var i, item, name, path;

			if (value && typeof value === 'object') {
				if (Object.prototype.toString.apply(value) === '[object Array]') {
					for (i = 0; i < value.length; i += 1) {
						item = value[i];
						if (item && typeof item === 'object') {
							path = item.$ref;
							if (typeof path === 'string' && px.test(path)) {
								value[i] = eval(path);
							} else {
								rez(item);
							}
						}
					}
				} else {
					for (name in value) {
						if (typeof value[name] === 'object') {
							item = value[name];
							if (item) {
								path = item.$ref;
								if (typeof path === 'string' && px.test(path)) {
									value[name] = eval(path);
								} else {
									rez(item);
								}
							}
						}
					}
				}
			}
		}($));
		return $;
	};
}