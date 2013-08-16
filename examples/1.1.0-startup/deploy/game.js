// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)

/**
 * Main function giving a function stack trace with a forced or passed in Error
 *
 * @cfg {Error} e The error to create a stacktrace from (optional)
 * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
 * @return {Array} of Strings with functions, lines, files, and arguments where possible
 */
function printStackTrace(options) {
    options = options || {guess: true};
    var ex = options.e || null, guess = !!options.guess;
    var p = new printStackTrace.implementation(), result = p.run(ex);
    var res = (guess) ? p.guessAnonymousFunctions(result) : result;
	for (var k = 0; k < 4; k++) {
		res.shift();
	}
	return res;
}

printStackTrace.implementation = function() {
};

printStackTrace.implementation.prototype = {
    run: function(ex) {
        ex = ex || this.createException();
        // Do not use the stored mode: different exceptions in Chrome
        // may or may not have arguments or stack
        var mode = this.mode(ex);
        // Use either the stored mode, or resolve it
        //var mode = this._mode || this.mode(ex);
        if (mode === 'other') {
            return this.other(arguments.callee);
        } else {
            return this[mode](ex);
        }
    },

    createException: function() {
        try {
            this.undef();
            return null;
        } catch (e) {
            return e;
        }
    },

    /**
     * @return {String} mode of operation for the environment in question.
     */
    mode: function(e) {
        if (e['arguments'] && e.stack) {
            return (this._mode = 'chrome');
        } else if (e.message && typeof window !== 'undefined' && window.opera) {
            return (this._mode = e.stacktrace ? 'opera10' : 'opera');
        } else if (e.stack) {
            return (this._mode = 'firefox');
        }
        return (this._mode = 'other');
    },

    /**
     * Given a context, function name, and callback function, overwrite it so that it calls
     * printStackTrace() first with a callback and then runs the rest of the body.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to instrument
     * @param {Function} function to call with a stack trace on invocation
     */
    instrumentFunction: function(context, functionName, callback) {
        context = context || window;
        var original = context[functionName];
        context[functionName] = function instrumented() {
            callback.call(this, printStackTrace().slice(4));
            return context[functionName]._instrumented.apply(this, arguments);
        };
        context[functionName]._instrumented = original;
    },

    /**
     * Given a context and function name of a function that has been
     * instrumented, revert the function to it's original (non-instrumented)
     * state.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to de-instrument
     */
    deinstrumentFunction: function(context, functionName) {
        if (context[functionName].constructor === Function &&
                context[functionName]._instrumented &&
                context[functionName]._instrumented.constructor === Function) {
            context[functionName] = context[functionName]._instrumented;
        }
    },

    /**
     * Given an Error object, return a formatted Array based on Chrome's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    chrome: function(e) {
        var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').
          replace(/^\s+at\s+/gm, '').
          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}()@$1$2').
          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
        stack.pop();
        return stack;
    },

    /**
     * Given an Error object, return a formatted Array based on Firefox's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    firefox: function(e) {
        return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
    },

    /**
     * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    opera10: function(e) {
        var stack = e.stacktrace;
        var lines = stack.split('\n'), ANON = '{anonymous}', lineRE = /.*line (\d+), column (\d+) in ((<anonymous function\:?\s*(\S+))|([^\(]+)\([^\)]*\))(?: in )?(.*)\s*$/i, i, j, len;
        for (i = 2, j = 0, len = lines.length; i < len - 2; i++) {
            if (lineRE.test(lines[i])) {
                var location = RegExp.$6 + ':' + RegExp.$1 + ':' + RegExp.$2;
                var fnName = RegExp.$3;
                fnName = fnName.replace(/<anonymous function\:?\s?(\S+)?>/g, ANON);
                lines[j++] = fnName + '@' + location;
            }
        }

        lines.splice(j, lines.length - j);
        return lines;
    },

    // Opera 7.x-9.x only!
    opera: function(e) {
        var lines = e.message.split('\n'), ANON = '{anonymous}', lineRE = /Line\s+(\d+).*script\s+(http\S+)(?:.*in\s+function\s+(\S+))?/i, i, j, len;

        for (i = 4, j = 0, len = lines.length; i < len; i += 2) {
            //TODO: RegExp.exec() would probably be cleaner here
            if (lineRE.test(lines[i])) {
                lines[j++] = (RegExp.$3 ? RegExp.$3 + '()@' + RegExp.$2 + RegExp.$1 : ANON + '()@' + RegExp.$2 + ':' + RegExp.$1) + ' -- ' + lines[i + 1].replace(/^\s+/, '');
            }
        }

        lines.splice(j, lines.length - j);
        return lines;
    },

    // Safari, IE, and others
    other: function(curr) {
        var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
        while (curr && stack.length < maxStackSize) {
            fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
            args = Array.prototype.slice.call(curr['arguments'] || []);
            stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
            curr = curr.caller;
        }
        return stack;
    },

    /**
     * Given arguments array as a String, subsituting type names for non-string types.
     *
     * @param {Arguments} object
     * @return {Array} of Strings with stringified arguments
     */
    stringifyArguments: function(args) {
        var slice = Array.prototype.slice;
        for (var i = 0; i < args.length; ++i) {
            var arg = args[i];
            if (arg === undefined) {
                args[i] = 'undefined';
            } else if (arg === null) {
                args[i] = 'null';
            } else if (arg.constructor) {
                if (arg.constructor === Array) {
                    if (arg.length < 3) {
                        args[i] = '[' + this.stringifyArguments(arg) + ']';
                    } else {
                        args[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
                    }
                } else if (arg.constructor === Object) {
                    args[i] = '#object';
                } else if (arg.constructor === Function) {
                    args[i] = '#function';
                } else if (arg.constructor === String) {
                    args[i] = '"' + arg + '"';
                }
            }
        }
        return args.join(',');
    },

    sourceCache: {},

    /**
     * @return {*} the text from a given URL.
     */
    ajax: function(url) {
        var req = this.createXMLHTTPObject();
        if (!req) {
            return;
        }
        req.open('GET', url, false);
        //req.setRequestHeader('User-Agent', 'XMLHTTP/1.0');
        req.send('');
        return req.responseText;
    },

    /**
     * Try XHR methods in order and store XHR factory.
     *
     * @return <Function> XHR function or equivalent
     */
    createXMLHTTPObject: function() {
        var xmlhttp, XMLHttpFactories = [
            function() {
                return new XMLHttpRequest();
            }, function() {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }, function() {
                return new ActiveXObject('Msxml3.XMLHTTP');
            }, function() {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }
        ];
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
                // Use memoization to cache the factory
                this.createXMLHTTPObject = XMLHttpFactories[i];
                return xmlhttp;
            } catch (e) {
            }
        }
    },

    /**
     * Given a URL, check if it is in the same domain (so we can get the source
     * via Ajax).
     *
     * @param url <String> source url
     * @return False if we need a cross-domain request
     */
    isSameDomain: function(url) {
        return url.indexOf(location.hostname) !== -1;
    },

    /**
     * Get source code from given URL if in the same domain.
     *
     * @param url <String> JS source URL
     * @return <Array> Array of source code lines
     */
    getSource: function(url) {
        if (!(url in this.sourceCache)) {
            this.sourceCache[url] = this.ajax(url).split('\n');
        }
        return this.sourceCache[url];
    },

    guessAnonymousFunctions: function(stack) {
        for (var i = 0; i < stack.length; ++i) {
            var reStack = /\{anonymous\}\(.*\)@(\w+:\/\/([\-\w\.]+)+(:\d+)?[^:]+):(\d+):?(\d+)?/;
            var frame = stack[i], m = reStack.exec(frame);
            if (m) {
                var file = m[1], lineno = m[4], charno = m[7] || 0; //m[7] is character position in Chrome
                if (file && this.isSameDomain(file) && lineno) {
                    var functionName = this.guessAnonymousFunction(file, lineno, charno);
                    stack[i] = frame.replace('{anonymous}', functionName);
                }
            }
        }
        return stack;
    },

    guessAnonymousFunction: function(url, lineNo, charNo) {
        var ret;
        try {
            ret = this.findFunctionName(this.getSource(url), lineNo);
        } catch (e) {
            ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
        }
        return ret;
    },

    findFunctionName: function(source, lineNo) {
        // FIXME findFunctionName fails for compressed source
        // (more than one function on the same line)
        // TODO use captured args
        // function {name}({args}) m[1]=name m[2]=args
        var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
        // {name} = function ({args}) TODO args capture
        // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
        var reFunctionExpression = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function\b/;
        // {name} = eval()
        var reFunctionEvaluation = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
        // Walk backwards in the source lines until we find
        // the line which matches one of the patterns above
        var code = "", line, maxLines = 10, m;
        for (var i = 0; i < maxLines; ++i) {
            // FIXME lineNo is 1-based, source[] is 0-based
            line = source[lineNo - i];
            if (line) {
                code = line + code;

                m = reFunctionExpression.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
                m = reFunctionDeclaration.exec(code);
                if (m && m[1]) {
                    //return m[1] + "(" + (m[2] || "") + ")";
                    return m[1];
                }
                m = reFunctionEvaluation.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
            }
        }
        return '(?)';
    }
};;/************************/
/* Isogenic Game Engine */
/************************/
ige = null;
igeVersion = '1.1.0';
igeClassStore = {};

igeConfig.debug = {
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
};/**
 * The base class system.
 */
var IgeClass = (function () {
	var initializing = false,
		fnTest = /xyz/.test(function () {xyz;}) ? /\b_super\b/ : /.*/,

		// The base Class implementation (does nothing)
		IgeClass = function () {},
		
		/**
		 * Provides logging capabilities to all IgeClass instances.
		 * @param {String} text The text to log.
		 * @param {String} type The type of log to output, can be 'log',
		 * 'info', 'warning' or 'error'.
		 * @param {Object=} obj An optional object that will be output
		 * before the log text is output.
		 * @example #Log a message
		 *     var entity = new IgeEntity();
		 *     
		 *     // Will output:
		 *     //     IGE *log* [IgeEntity] : hello
		 *     entity.log('Hello');
		 * @example #Log an info message with an optional parameter
		 *     var entity = new IgeEntity(),
		 *         param = 'moo';
		 *	
		 *     // Will output:
		 *     //    moo
		 *     //    IGE *log* [IgeEntity] : hello
		 *     entity.log('Hello', 'info', param);
		 * @example #Log a warning message (which will cause a stack trace to be shown)
		 *     var entity = new IgeEntity();
		 *	
		 *     // Will output (stack trace is just an example here, real one will be more useful):
		 *     //    Stack: {anonymous}()@<anonymous>:2:8
		 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
		 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
		 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
		 *     //    IGE *warning* [IgeEntity] : A test warning
		 *     entity.log('A test warning', 'warning');
		 * @example #Log an error message (which will cause an exception to be raised and a stack trace to be shown)
		 *     var entity = new IgeEntity();
		 *	
		 *     // Will output (stack trace is just an example here, real one will be more useful):
		 *     //    Stack: {anonymous}()@<anonymous>:2:8
		 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
		 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
		 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
		 *     //    IGE *error* [IgeEntity] : An error message
		 *     entity.log('An error message', 'error');
		 */
		log = function (text, type, obj) {
			if (igeConfig.debug._enabled) {
				var indent = '',
					stack;

				type = type || 'log';

				if (obj !== undefined) {
					console.warn(obj);
				}

				if (type === 'warning' || type === 'error') {
					if (igeConfig.debug._stacks) {
						if (igeConfig.debug._node) {
							stack = new Error().stack;
							//console.log(color.magenta('Stack:'), color.red(stack));
							console.log('Stack:', stack);
						} else {
							if (typeof(printStackTrace) === 'function') {
								console.log('Stack:', printStackTrace().join('\n ---- '));
							}
						}
					}
				}

				if (type === 'error') {
					if (igeConfig.debug._throwErrors) {
						throw(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
					} else {
						console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
					}
				} else {
					console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
				}
			}

			return this;
		},

		/**
		 * Returns the class id. Primarily used to help identify
		 * what class an instance was instantiated with and is also
		 * output during the ige.scenegraph() method's console logging
		 * to show what class an object belongs to.
		 * @example #Get the class id of an object
		 *     var entity = new IgeEntity();
		 *	
		 *     // Will output "IgeEntity"
		 *     console.log(entity.classId());
		 */
		classId = function () {
			return this._classId;
		},

		/**
		 * Creates a new instance of the component argument passing
		 * the options argument to the component as it is initialised.
		 * The new component instance is then added to "this" via
		 * a property name that is defined in the component class as
		 * "componentId".
		 * @param {IgeClass} component The class definition of the component.
		 * @param {Object=} options An options parameter to pass to the component
		 * on init.
		 * @example #Add the velocity component to an entity
		 *     var entity = new IgeEntity();
		 *     entity.addComponent(IgeVelocityComponent);
		 *     
		 *     // Now that the component is added, we can access
		 *     // the component via it's namespace. Call the 
		 *     // "byAngleAndPower" method of the velocity component:
		 *     entity.velocity.byAngleAndPower(Math.radians(20), 0.1);
		 */
		addComponent = function (component, options) {
			var newComponent = new component(this, options);
			this[newComponent.componentId] = newComponent;

			// Add the component reference to the class component array
			this._components.push(newComponent);

			return this;
		},

		/**
		 * Removes a component by it's id.
		 * @param {String} componentId The id of the component to remove.
		 * @example #Remove a component by it's id (namespace)
		 *     var entity = new IgeEntity();
		 *     
		 *     // Let's add the velocity component
		 *     entity.addComponent(IgeVelocityComponent);
		 *	
		 *     // Now that the component is added, let's remove
		 *     // it via it's id ("velocity")
		 *     entity.removeComponent('velocity');
		 */
		removeComponent = function (componentId) {
			// If the component has a destroy method, call it
			if (this[componentId] && this[componentId].destroy) {
				this[componentId].destroy();
			}

			// Remove the component from the class component array
			if (this._components) {
				this._components.pull(this[componentId]);
			}

			// Remove the component namespace from the class object
			delete this[componentId];
			return this;
		},

		/**
		 * Copies all properties and methods from the classObj object
		 * to "this". If the overwrite flag is not set or set to false,
		 * only properties and methods that don't already exists in
		 * "this" will be copied. If overwrite is true, they will be
		 * copied regardless.
		 * @param {Function} classObj
		 * @param {Boolean} overwrite
		 * @example #Implement all the methods of an object into another object
		 *     // Create a couple of test entities with ids
		 *     var entity1 = new IgeEntity().id('entity1'),
		 *         entity2 = new IgeEntity().id('entity2');
		 *	
		 *     // Let's define an object with a couple of methods
		 *     var obj = {
		 *         newMethod1: function () {
		 *             console.log('method1 called on object: ' + this.id());
		 *         },
		 *         
		 *         newMethod2: function () {
		 *             console.log('method2 called on object: ' + this.id());
		 *         }
		 *     };
		 *	
		 *     // Now let's implement the methods on our entities
		 *     entity1.implement(obj);
		 *     entity2.implement(obj);
		 *     
		 *     // The entities now have the newMethod1 and newMethod2
		 *     // methods as part of their instance so we can call them:
		 *     entity1.newMethod1();
		 *     
		 *     // The output to the console is:
		 *     //    method1 called on object: entity1
		 *     
		 *     // Now let's call newMethod2 on entity2:
		 *     entity2.newMethod2();
		 *	
		 *     // The output to the console is:
		 *     //    method2 called on object: entity2
		 *     
		 *     // As you can see, this is a great way to add extra modular
		 *     // functionality to objects / entities at runtime.
		 */
		implement = function (classObj, overwrite) {
			var i, obj = classObj.prototype || classObj;

			// Copy the class object's properties to (this)
			for (i in obj) {
				// Only copy the property if this doesn't already have it
				if (obj.hasOwnProperty(i) && (overwrite || this[i] === undefined)) {
					this[i] = obj[i];
				}
			}
			return this;
		},

		/**
		 * Gets / sets a key / value pair in the object's data object. Useful for
		 * storing arbitrary game data in the object.
		 * @param {String} key The key under which the data resides.
		 * @param {*=} value The data to set under the specified key.
		 * @example #Set some arbitrary data key value pair
		 *     var entity = new IgeEntity();
		 *     entity.data('playerScore', 100);
		 *     entity.data('playerName', 'iRock');
		 * @example #Get the value of a data key
		 *     console.log(entity.data('playerScore'));
		 *     console.log(entity.data('playerName'));
		 * @return {*}
		 */
		data = function (key, value) {
			if (key !== undefined) {
				if (value !== undefined) {
					this._data[key] = value;

					return this;
				}

				return this._data[key];
			}
		};

	/**
	 * Create a new IgeClass that inherits from this class
	 * @name extend
	 * @example #Creating a new class by extending an existing one
	 *     var NewClass = IgeClass.extend({
	 *         // Init is your constructor
	 *         init: function () {
	 *             console.log('I\'m alive!');
	 *         }
	 *     });
	 * 
	 * Further reading: [Extending Classes](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/engine-fundamentals/classes/extending-classes/)
	 * @return {Function}
	 */
	IgeClass.extend = function () {
		var _super = this.prototype,
			name,
			prototype,
			// Set prop to the last argument passed
			prop = arguments[arguments.length - 1],
			extensionArray = arguments[0],
			extensionItem,
			extensionOverwrite,
			extensionIndex,
			propertyIndex,
			propertyObject;

		// Check that the class has been assigned a classId and bug out if not
		if (!prop.classId) {
			console.log(prop);
			throw('Cannot create a new class without giving the class a classId property!');
		}

		// Check that the classId is not already in use
		if (igeClassStore[prop.classId]) {
			// This classId has already been used, bug out
			throw('Cannot create class with classId "' + prop.classId + '" because a class with that ID has already been created!');
		}

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (name in prop) {
			// Check if we're overwriting an existing function
			if (typeof(prop[name]) === "function" && typeof(_super[name]) === "function" && fnTest.test(prop[name])) {
				// Allow access to original source code
				// so we can edit the engine live
				prototype['__' + name] = prop[name];

				// Assign a new method to allow access to the
				// super-class method via CLASSNAME.prototype._editNAME_.call(this) in the
				// new method
				prototype[name] = (function (name, fn) {
					return function () {
						var tmp = this._super,
							ret;

						// Add a new .CLASSNAME.prototype._editNAME_.call(this) method that is the same method
						// but on the super-class
						this._super = _super[name];

						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						ret = fn['__' + name].apply(this, arguments);
						//ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				}(name, prototype));
			} else {
				// The prop is not a method
				prototype[name] = prop[name];
			}
		}

		// Now implement any other extensions
		if (arguments.length > 1) {
			if (extensionArray && extensionArray.length) {
				for (extensionIndex = 0; extensionIndex < extensionArray.length; extensionIndex++) {
					extensionItem = extensionArray[extensionIndex];
					propertyObject = extensionItem.extension.prototype || extensionItem.extension;
					extensionOverwrite = extensionItem.overwrite;

					// Copy the class object's properties to (this)
					for (propertyIndex in propertyObject) {
						// Only copy the property if this doesn't already have it or
						// the extension is set to overwrite any existing properties
						if (propertyObject.hasOwnProperty(propertyIndex) && (extensionOverwrite || prototype[propertyIndex] === undefined)) {
							prototype[propertyIndex] = propertyObject[propertyIndex];
						}
					}
				}
			}
		}

		// The dummy class constructor
		function IgeClass() {
			this._data = {};
			if (!initializing && this.init) {
				// Create an array to hold components
				this._components = [];

				// Store a reference to the global ige object
				if (typeof(ige) !== 'undefined') {
					this.ige = ige;
				}

				// Call the class init method
				this.init.apply(this, arguments);
			}
		}

		// Populate our constructed prototype object
		IgeClass.prototype = prototype;

		// Enforce the constructor to be what we expect
		IgeClass.prototype.constructor = IgeClass;

		// And make this class extendable
		IgeClass.extend = arguments.callee;

		// Add log capability
		IgeClass.prototype.log = log;

		// Add data capability
		IgeClass.prototype.data = data;

		// Add class name capability
		IgeClass.prototype.classId = classId;
		IgeClass.prototype._classId = prop.classId || 'IgeClass';

		// Add the addComponent method
		IgeClass.prototype.addComponent = addComponent;

		// Add the removeComponent method
		IgeClass.prototype.removeComponent = removeComponent;

		// Add the implement method
		IgeClass.prototype.implement = implement;

		// Register the class with the class store
		igeClassStore[prop.classId] = IgeClass;

		return IgeClass;
	};

	IgeClass.prototype._classId = 'IgeClass';

	return IgeClass;
}());

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeClass; };/**
 * Creates a new class with the capability to emit events.
 */
var IgeEventingClass = IgeClass.extend({
	classId: 'IgeEventingClass',

	/**
	 * Add an event listener method for an event.
	 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
	 * @param {Function} call The method to call when the event listener is triggered.
	 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
	 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
	 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
	 * @return {Object}
	 */
	on: function (eventName, call, context, oneShot, sendEventName) {
		var self = this,
			newListener,
			addListener,
			existingIndex,
			elArr,
			multiEvent,
			eventIndex,
			eventData,
			eventObj,
			multiEventName,
			i;

		// Check that we have an event listener object
		this._eventListeners = this._eventListeners || {};

		if (typeof call === 'function') {
			if (typeof eventName === 'string') {
				// Compose the new listener
				newListener = {
					call:call,
					context:context,
					oneShot:oneShot,
					sendEventName:sendEventName
				};

				elArr = this._eventListeners[eventName] = this._eventListeners[eventName] || [];

				// Check if we already have this listener in the list
				addListener = true;

				// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
				existingIndex = elArr.indexOf(newListener);
				if (existingIndex > -1) {
					addListener = false;
				}

				// Add this new listener
				if (addListener) {
					elArr.push(newListener);
				}

				return newListener;
			} else {
				// The eventName is an array of names, creating a group of events
				// that must be fired to fire this event callback
				if (eventName.length) {
					// Loop the event array
					multiEvent = [];
					multiEvent[0] = 0; // This will hold our event count total
					multiEvent[1] = 0; // This will hold our number of events fired

					// Define the multi event callback
					multiEvent[3] = function (firedEventName) {
						multiEvent[1]++;

						if (multiEvent[0] === multiEvent[1]) {
							// All the multi-event events have fired
							// so fire the callback
							call.apply(context || self);
						}
					};

					for (eventIndex in eventName) {
						if (eventName.hasOwnProperty(eventIndex)) {
							eventData = eventName[eventIndex];
							eventObj = eventData[0];
							multiEventName = eventData[1];

							// Increment the event listening count total
							multiEvent[0]++;

							// Register each event against the event object with a callback
							eventObj.on(multiEventName, multiEvent[3], null, true, true);
						}
					}
				}
			}
		} else {
			if (typeof(eventName) !== 'string') {
				eventName = '*Multi-Event*';
			}
			this.log('Cannot register event listener for event "' + eventName + '" because the passed callback is not a function!', 'error');
		}
	},

	/**
	 * Emit an event by name.
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} args The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {

				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length,
					eventCount2 = this._eventListeners[eventName].length - 1,
					finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					finalArgs = [];
					if (typeof(args) === 'object' && args !== null && args[0] !== null && args[0] !== undefined) {
						for (i in args) {
							if (args.hasOwnProperty(i)) {
								finalArgs[i] = args[i];
							}
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					cancelFlag = false;

					this._eventListeners._processing = true;
					while (eventCount--) {
						eventIndex = eventCount2 - eventCount;
						tempEvt = this._eventListeners[eventName][eventIndex];


						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) { finalArgs = [eventName]; }

						// Call the callback
						retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						if (retVal === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							this.off(eventName, tempEvt);
							eventCount2--;
						}
					}

					// Check that the array still exists because an event
					// could have triggered a method that destroyed our object
					// which would have deleted the array!
					if (this._eventListeners) {
						this._eventListeners._processing = false;

						// Now process any event removal
						this._processRemovals();
					}

					if (cancelFlag) {
						return 1;
					}

				}

			}
		}
	},

	/**
	 * Loops the removals array and processes off() calls for
	 * each array item.
	 * @private
	 */
	_processRemovals: function () {
		if (this._eventListeners) {
			var remArr = this._eventListeners._removeQueue,
				arrCount,
				item,
				result;

			// If the removal array exists
			if (remArr) {
				// Get the number of items in the removal array
				arrCount = remArr.length;

				// Loop the array
				while (arrCount--) {
					item = remArr[arrCount];

					// Call the off() method for this item
					result = this.off(item[0], item[1]);

					// Check if there is a callback
					if (remArr[2]) {
						// Call the callback with the removal result
						remArr[2](result);
					}
				}
			}

			// Remove the removal array
			delete this._eventListeners._removeQueue;
		}
	},

	/**
	 * Remove an event listener. If the _processing flag is true
	 * then the removal will be placed in the removals array to be
	 * processed after the event loop has completed in the emit()
	 * method.
	 * @param {Boolean} eventName The name of the event you originally registered to listen for.
	 * @param {Object} evtListener The event listener object to cancel.
	 * @return {Boolean}
	 */
	off: function (eventName, evtListener, callback) {
		if (this._eventListeners) {
			if (!this._eventListeners._processing) {
				if (this._eventListeners[eventName]) {
					// Find this listener in the list
					var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
					if (evtListIndex > -1) {
						// Remove the listener from the event listener list
						this._eventListeners[eventName].splice(evtListIndex, 1);
						if (callback) {
							callback(true);
						}
						return true;
					} else {
						this.log('Failed to cancel event listener for event named "' + eventName + '" !', 'warning', evtListener);
					}
				} else {
					this.log('Failed to cancel event listener!');
				}
			} else {
				// Add the removal to a remove queue since we are processing
				// listeners at the moment and removing one would mess up the
				// loop!
				this._eventListeners._removeQueue = this._eventListeners._removeQueue || [];
				this._eventListeners._removeQueue.push([eventName, evtListener, callback]);

				return -1;
			}
		}

		if (callback) {
			callback(false);
		}
		return false;
	},

	/**
	 * Returns an object containing the current event listeners.
	 * @return {Object}
	 */
	eventList: function () {
		return this._eventListeners;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEventingClass; };/**
 * Creates a new 3d point (x, y, z).
 */
var IgePoint = IgeClass.extend({
	classId: 'IgePoint',

	init: function (x, y, z, floor) {
		if (floor === undefined) {
			this._floor = true;
		} else {
			this.floor(floor);
		}

		// Set values to the passed parameters or
		// zero if they are undefined
		this.x = x = x !== undefined ? x : 0;
		this.y = y = y !== undefined ? y : 0;
		this.z = z = z !== undefined ? z : 0;

		if (this._floor) {
			this.x2 = Math.floor(x / 2);
			this.y2 = Math.floor(y / 2);
			this.z2 = Math.floor(z / 2);
		} else {
			this.x2 = x / 2;
			this.y2 = y / 2;
			this.z2 = z / 2;
		}

		return this;
	},

	/**
	 * Gets / sets the floor mode of this point. If set to true the point's
	 * data will be mathematically floored when they are assigned.
	 * @param val
	 * @return {*}
	 */
	floor: function (val) {
		if (val !== undefined) {
			this._floor = val;
			return this;
		}

		return this._floor;
	},

	/**
	 * Compares this point's x, y, z data with the passed point and returns
	 * true if they are the same and false if any is different.
	 * @param point
	 * @return {Boolean}
	 */
	compare: function (point) {
		return point && this.x === point.x && this.y === point.y && this.z === point.z;
	},

	/**
	 * Converts the point's x, y, z to an isometric x, y 2d co-ordinate
	 * and returns an object whose x, y values are the result.
	 * @return {Object}
	 */
	toIso: function () {
		var sx = this.x - this.y,
			sy = (-this.z) * 1.2247 + (this.x + this.y) * 0.5;

		return {x: sx, y: sy};
	},

	/**
	 * Converts this point's x, y, z data into isometric co-ordinate space
	 * and overwrites the previous x, y, z values with the result.
	 * @return {*}
	 */
	thisToIso: function () {
		var val = this.toIso();
		this.x = val.x;
		this.y = val.y;
		this.z = 0;

		return this;
	},

	/**
	 * Converts this point's x, y, z data into 2d co-ordinate space
	 * and returns an object whose x, y values are the result.
	 * @return {Object}
	 */
	to2d: function () {
		var sx = this.y + this.x / 2,
			sy = this.y - this.x / 2;

		return {x: sx, y: sy};
	},

	/**
	 * Converts this point's x, y, z data into 2d co-ordinate space
	 * and overwrites the previous x, y, z values with the result.
	 * @return {*}
	 */
	thisTo2d: function () {
		var val = this.to2d();
		this.x = val.x;
		this.y = val.y;
		this.z = 0;

		return this;
	},

	/**
	 * Adds this point's data by the x, y, z, values specified
	 * and returns a new IgePoint whose values are the result.
	 * @param point
	 * @return {*}
	 */
	addPoint: function (point) {
		return new IgePoint(this.x + point.x, this.y + point.y, this.z + point.z);
	},

	/**
	 * Adds this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param point
	 * @return {*}
	 */
	thisAddPoint: function (point) {
		this.x += point.x;
		this.y += point.y;
		this.z += point.z;

		return this;
	},

	/**
	 * Minuses this point's data by the x, y, z, values specified
	 * and returns a new IgePoint whose values are the result.
	 * @param point
	 * @return {*}
	 */
	minusPoint: function (point) {
		return new IgePoint(this.x - point.x, this.y - point.y, this.z - point.z);
	},

	/**
	 * Minuses this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param point
	 * @return {*}
	 */
	thisMinusPoint: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		this.z -= point.z;

		return this;
	},

	/**
	 * Multiplies this point's data by the x, y, z, values specified
	 * and returns a new IgePoint whose values are the result.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	multiply: function (x, y, z) {
		return new IgePoint(this.x * x, this.y * y, this.z * z);
	},

	/**
	 * Multiplies this point's data by the point specified
	 * and returns a new IgePoint whose values are the result.
	 * @param {IgePoint} point
	 * @return {*}
	 */
	multiplyPoint: function (point) {
		return new IgePoint(this.x * point.x, this.y * point.y, this.z * point.z);
	},

	/**
	 * Multiplies this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	thisMultiply: function (x, y, z) {
		this.x *= x;
		this.y *= y;
		this.z *= z;

		return this;
	},

	/**
	 * Divides this point's data by the x, y, z, values specified
	 * and returns a new IgePoint whose values are the result.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	divide: function (x, y, z) {
		return new IgePoint(this.x / x, this.y / y, this.z / z);
	},

	/**
	 * Divides this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	thisDivide: function (x, y, z) {
		this.x /= x;
		this.y /= y;
		this.z /= z;

		return this;
	},

	/**
	 * Returns a clone of this IgePoint's data as a new instance.
	 * @return {*}
	 */
	clone: function () {
		return new IgePoint(this.x, this.y, this.z);
	},

	/**
	 * Interpolates the x, y, z values of this point towards the endPoint's
	 * x, y, z values based on the passed time variables and returns a new
	 * IgePoint whose values are the result.
	 * @param endPoint
	 * @param startTime
	 * @param currentTime
	 * @param endTime
	 * @return {*}
	 */
	interpolate: function (endPoint, startTime, currentTime, endTime) {
		var totalX = endPoint.x - this.x,
			totalY = endPoint.y - this.y,
			totalZ = endPoint.z - this.z,
			totalTime = endTime - startTime,
			deltaTime = totalTime - (currentTime - startTime),
			timeRatio = deltaTime / totalTime;

		return new IgePoint(endPoint.x - (totalX * timeRatio), endPoint.y - (totalY * timeRatio), endPoint.z - (totalZ * timeRatio));
	},

	/**
	 * Returns a string representation of the point's x, y, z
	 * converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString: function (precision) {
		if (precision === undefined) { precision = 2; }
		return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.z.toFixed(precision);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoint; };/**
 * Creates a new 2d polygon made up of IgePoint instances.
 */
var IgePoly2d = IgeClass.extend({
	classId: 'IgePoly2d',

	init: function () {
		this._poly = [];
		this._scale = new IgePoint(1, 1, 1);
	},

	scale: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._scale.x = x;
			this._scale.y = y;

			return this;
		}

		return this._scale;
	},

	/**
	 * Multiplies the points of the polygon by the supplied factor.
	 * @param {Number} factor The multiplication factor.
	 * @return {*}
	 */
	multiply: function (factor) {
		if (factor !== undefined) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x *= factor;
				polyPoints[pointIndex].y *= factor;
			}
		}

		return this;
	},

	/**
	 * Divides the points of the polygon by the supplied value.
	 * @param {Number} value The divide value.
	 * @return {*}
	 */
	divide: function (value) {
		if (value !== undefined) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x /= value;
				polyPoints[pointIndex].y /= value;
			}
		}

		return this;
	},

	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0.
	 * @param x
	 * @param y
	 */
	addPoint: function (x, y) {
		this._poly.push(new IgePoint(x, y, 0));
		return this;
	},

	/**
	 * Returns the length of the poly array.
	 * @return {Number}
	 */
	length: function () {
		return this._poly.length;
	},

	/**
	 * Check if a point is inside this polygon.
	 * @param {IgePoint} point
	 * @return {Boolean}
	 */
	pointInPoly: function (point) {
		var polyPoints = this._poly,
			pointCount = polyPoints.length,
			pointIndex,
			oldPointIndex = pointCount - 1,
			c = 0;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (((polyPoints[pointIndex].y > point.y) !== (polyPoints[oldPointIndex].y > point.y)) &&
				(point.x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(point.y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
				c = !c;
			}
		}

		return c;
	},

	/**
	 * Returns a copy of this IgePoly2d object that is
	 * it's own version, separate from the original.
	 * @return {IgePoly2d}
	 */
	clone: function () {
		var newPoly = new IgePoly2d(),
			arr = this._poly,
			arrCount = arr.length,
			i;

		for (i = 0; i < arrCount; i++) {
			newPoly.addPoint(arr[i].x, arr[i].y);
		}

		newPoly.scale(this._scale.x, this._scale.y);

		return newPoly;
	},

	/**
	 * Determines if the polygon is clockwise or not.
	 * @return {Boolean} A boolean true if clockwise or false
	 * if not.
	 */
	clockWiseTriangle: function () {
		// Loop the polygon points and determine if they are counter-clockwise
		var arr = this._poly,
			val,
			p1, p2, p3;

		p1 = arr[0];
		p2 = arr[1];
		p3 = arr[2];

		val = (p1.x * p2.y) + (p2.x * p3.y) + (p3.x * p1.y) - (p2.y * p3.x) - (p3.y * p1.x) - (p1.y * p2.x);

		return val > 0;
	},

	makeClockWiseTriangle: function () {
		// If our data is already clockwise exit
		if (!this.clockWiseTriangle()) {
			var p0 = this._poly[0],
				p1 = this._poly[1],
				p2 = this._poly[2];

			this._poly[2] = p1;
			this._poly[1] = p2;
		}
	},

	triangulate: function () {
		// Get the indices of each new triangle
		var poly = this._poly,
			triangles = [],
			indices = this.triangulationIndices(),
			i,
			point1,
			point2,
			point3,
			newPoly;

		// Generate new polygons from the index data
		for (i = 0; i < indices.length; i += 3) {
			point1 = poly[indices[i]];
			point2 = poly[indices[i + 1]];
			point3 = poly[indices[i + 2]];
			newPoly = new IgePoly2d();

			newPoly.addPoint(point1.x, point1.y);
			newPoly.addPoint(point2.x, point2.y);
			newPoly.addPoint(point3.x, point3.y);

			// Check the new poly and make sure it's clockwise
			newPoly.makeClockWiseTriangle();
			triangles.push(newPoly);
		}

		return triangles;
	},

	triangulationIndices: function () {
		var indices = [],
			n = this._poly.length,
			v = [],
			V = [],
			nv,
			count,
			m,
			u,
			w,
			a,
			b,
			c,
			s,
			t;
		
		if (n < 3) { return indices; }

		if (this._area() > 0) {
			for (v = 0; v < n; v++) {
				V[v] = v;
			}
		} else {
			for (v = 0; v < n; v++) {
				V[v] = (n - 1) - v;
			}
		}

		nv = n;
		count = 2 * nv;
		m = 0;

		for (v = nv - 1; nv > 2; ) {
			if ((count--) <= 0) {
				return indices;
			}

			u = v;
			if (nv <= u) {
				u = 0;
			}

			v = u + 1;

			if (nv <= v) {
				v = 0;
			}

			w = v + 1;

			if (nv <= w) {
				w = 0;
			}

			if (this._snip(u, v, w, nv, V)) {
				a = V[u];
				b = V[v];
				c = V[w];
				indices.push(a);
				indices.push(b);
				indices.push(c);
				m++;
				s = v;

				for (t = v + 1; t < nv; t++) {
					V[s] = V[t];
					s++;
				}

				nv--;
				count = 2 * nv;
			}
		}

		indices.reverse();
		return indices;
	},

	_area: function () {
		var n = this._poly.length,
			a = 0.0,
			q = 0,
			p,
			pval,
			qval;

		for (p = n - 1; q < n; p = q++) {
			pval = this._poly[p];
			qval = this._poly[q];
			a += pval.x * qval.y - qval.x * pval.y;
		}

		return (a * 0.5);
	},

	_snip: function (u, v, w, n, V) {
		var p,
			A = this._poly[V[u]],
			B = this._poly[V[v]],
			C = this._poly[V[w]],
			P;

		// Replaced Math.Epsilon with 0.00001
		if (0.00001 > (((B.x - A.x) * (C.y - A.y)) - ((B.y - A.y) * (C.x - A.x)))) {
			return false;
		}

		for (p = 0; p < n; p++) {
			if ((p == u) || (p == v) || (p == w)) {
				continue;
			}

			P = this._poly[V[p]];
			if (this._insideTriangle(A, B, C, P)) {
				return false;
			}
		}

		return true;
	},

	_insideTriangle: function (A, B, C, P) {
		var ax,
			ay,
			bx,
			by,
			cx,
			cy,
			apx,
			apy,
			bpx,
			bpy,
			cpx,
			cpy,
			cCROSSap,
			bCROSScp,
			aCROSSbp;

		ax = C.x - B.x; ay = C.y - B.y;
		bx = A.x - C.x; by = A.y - C.y;
		cx = B.x - A.x; cy = B.y - A.y;
		apx = P.x - A.x; apy = P.y - A.y;
		bpx = P.x - B.x; bpy = P.y - B.y;
		cpx = P.x - C.x; cpy = P.y - C.y;

		aCROSSbp = ax * bpy - ay * bpx;
		cCROSSap = cx * apy - cy * apx;
		bCROSScp = bx * cpy - by * cpx;

		return ((aCROSSbp >= 0.0) && (bCROSScp >= 0.0) && (cCROSSap >= 0.0));
	},

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render: function (ctx) {
		var polyPoints = this._poly,
			pointCount = polyPoints.length,
			scaleX = this._scale.x,
			scaleY = this._scale.y,
			i;

		ctx.beginPath();
		ctx.moveTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		for (i = 1; i < pointCount; i++) {
			ctx.lineTo(polyPoints[i].x * scaleX, polyPoints[i].y * scaleY);
		}
		ctx.lineTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		ctx.stroke();

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoly2d; };/**
 * Creates a new rectangle (x, y, width, height).
 */
var IgeRect = IgeClass.extend({
	classId: 'IgeRect',

	init: function (x, y, width, height) {
		// Set values to the passed parameters or
		// zero if they are undefined
		this.x = x = x !== undefined ? x : 0;
		this.y = y = y !== undefined ? y : 0;
		this.width = width = width !== undefined ? width : 0;
		this.height = height = height !== undefined ? height : 0;

		/*this.x2 = this.x / 2;
		this.y2 = this.y / 2;*/

		return this;
	},
	
	minusPoint: function (point) {
		return new IgeRect(this.x - point.x, this.y - point.y, this.width, this.height);
	},

	/**
	 * Compares this rect's dimensions with the passed rect and returns
	 * true if they are the same and false if any is different.
	 * @param {IgeRect} rect
	 * @return {Boolean}
	 */
	compare: function (rect) {
		return rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
	},

	/**
	 * Returns boolean indicating if the passed x, y is
	 * inside the rectangle.
	 * @param x
	 * @param y
	 * @return {Boolean}
	 */
	xyInside: function (x, y) {
		return x >= this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed point is
	 * inside the rectangle.
	 * @param {IgePoint} point
	 * @return {Boolean}
	 */
	pointInside: function (point) {
		return x >= this.x && point.y > this.y && point.x <= this.x + this.width && point.y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed IgeRect is
	 * intersecting the rectangle.
	 * @param {IgeRect} rect
	 * @return {Boolean}
	 */
	rectIntersect: function (rect) {
		if (rect) {
			var sX1 = this.x,
				sY1 = this.y,
				sW = this.width,
				sH = this.height,

				dX1 = rect.x,
				dY1 = rect.y,
				dW = rect.width,
				dH = rect.height,

				sX2 = sX1 + sW,
				sY2 = sY1 + sH,
				dX2 = dX1 + dW,
				dY2 = dY1 + dH;

			if (sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Returns a string representation of the rect's x, y, width,
	 * height, converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString: function (precision) {
		if (precision === undefined) { precision = 2; }
		return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.width.toFixed(precision) + ',' + this.height.toFixed(precision);
	}
})

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeRect; };// TODO: Clean up the variable declarations in this file so they all run on the same var call.
/**
 * Creates a new transformation matrix.
 */
var IgeMatrix2d = function() {
	this.matrix = [
		1.0,0.0,0.0,
		0.0,1.0,0.0,
		0.0,0.0,1.0
	];

	this._rotateOrigin = new IgePoint(0, 0, 0);
	this._scaleOrigin = new IgePoint(0, 0, 0);
};

IgeMatrix2d.prototype = {
	matrix:	null,

	/**
	 * Transform a point by this matrix. The parameter point will be modified with the transformation values.
	 * @param point {IgePoint}.
	 * @return {IgePoint} the parameter point.
	 */
	transformCoord: function(point) {
		var x = point.x,
			y = point.y,
			tm = this.matrix;

		point.x = x * tm[0] + y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] + tm[5];

		return point;
	},

	/**
	 * Transform a point by this matrix in inverse. The parameter point will be modified with the transformation values.
	 * @param point {IgePoint}.
	 * @return {IgePoint} the parameter point.
	 */
	transformCoordInverse: function(point) {
		var x = point.x,
			y = point.y,
			tm = this.matrix;

		point.x = x * tm[0] - y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] - tm[5];

		return point;
	},

	transform: function (points) {
		var pointIndex,
			pointCount = points.length;

		for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
			this.transformCoord(points[pointIndex]);
		}

		return points;
	},

	/**
	 * Create a new rotation matrix and set it up for the specified angle in radians.
	 * @param angle {number}
	 * @return {IgeMatrix2d} a matrix object.
	 *
	 * @static
	 */
	_newRotate: function(angle) {
		var m = new IgeMatrix2d();
		m.rotateTo(angle);
		return m;
	},

	rotateBy: function(angle) {
		var m = new IgeMatrix2d();

		m.translateBy(this._rotateOrigin.x, this._rotateOrigin.y);
		m.rotateTo(angle);
		m.translateBy(-this._rotateOrigin.x, -this._rotateOrigin.y);

		this.multiply(m);

		return this;
	},

	rotateTo: function (angle) {
		var tm = this.matrix,
			c = Math.cos(angle),
			s = Math.sin(angle);

		tm[0] = c;
		tm[1] = -s;
		tm[3] = s;
		tm[4] = c;

		return this;
	},

	/**
	 * Gets the rotation from the matrix and returns it in
	 * radians.
	 * @return {Number}
	 */
	rotationRadians: function () {
		return Math.asin(this.matrix[3]);
	},

	/**
	 * Gets the rotation from the matrix and returns it in
	 * degrees.
	 * @return {Number}
	 */
	rotationDegrees: function () {
		return Math.degrees(Math.acos(this.matrix[0]));
	},

	/**
	 * Create a scale matrix.
	 * @param x {number} x scale magnitude.
	 * @param y {number} y scale magnitude.
	 *
	 * @return {IgeMatrix2d} a matrix object.
	 *
	 * @static
	 */
	_newScale: function(x, y) {
		var m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		return m;
	},

	scaleBy: function(x, y) {
		var m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		this.multiply(m);

		return this;
	},

	scaleTo: function(x, y) {
		//this.identity();
		this.matrix[0] = x;
		this.matrix[4] = y;

		return this;
	},

	/**
	 * Create a translation matrix.
	 * @param x {number} x translation magnitude.
	 * @param y {number} y translation magnitude.
	 *
	 * @return {IgeMatrix2d} a matrix object.
	 * @static
	 *
	 */
	_newTranslate: function (x, y) {
		var m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		return m;
	},

	translateBy: function (x, y) {
		var m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		this.multiply(m);

		return this;
	},

	/**
	 * Sets this matrix as a translation matrix.
	 * @param x
	 * @param y
	 */
	translateTo: function (x, y) {
		this.matrix[2] = x;
		this.matrix[5] = y;

		return this;
	},

	/**
	 * Copy into this matrix the given matrix values.
	 * @param matrix {IgeMatrix2d}
	 * @return this
	 */
	copy: function (matrix) {
		matrix = matrix.matrix;

		var tmatrix = this.matrix;
		tmatrix[0] = matrix[0];
		tmatrix[1] = matrix[1];
		tmatrix[2] = matrix[2];
		tmatrix[3] = matrix[3];
		tmatrix[4] = matrix[4];
		tmatrix[5] = matrix[5];
		tmatrix[6] = matrix[6];
		tmatrix[7] = matrix[7];
		tmatrix[8] = matrix[8];

		return this;
	},

	/**
	 * Set this matrix to the identity matrix.
	 * @return this
	 */
	identity: function() {

		var m = this.matrix;
		m[0] = 1.0;
		m[1] = 0.0;
		m[2] = 0.0;

		m[3] = 0.0;
		m[4] = 1.0;
		m[5] = 0.0;

		m[6] = 0.0;
		m[7] = 0.0;
		m[8] = 1.0;

		return this;
	},

	/**
	 * Multiply this matrix by a given matrix.
	 * @param m {IgeMatrix2d}
	 * @return this
	 */
	multiply: function (m) {
		var tm = this.matrix,
			mm = m.matrix,

			tm0 = tm[0],
			tm1 = tm[1],
			tm2 = tm[2],
			tm3 = tm[3],
			tm4 = tm[4],
			tm5 = tm[5],
			tm6 = tm[6],
			tm7 = tm[7],
			tm8 = tm[8],

			mm0 = mm[0],
			mm1 = mm[1],
			mm2 = mm[2],
			mm3 = mm[3],
			mm4 = mm[4],
			mm5 = mm[5],
			mm6 = mm[6],
			mm7 = mm[7],
			mm8 = mm[8];

		tm[0] = tm0*mm0 + tm1*mm3 + tm2*mm6;
		tm[1] = tm0*mm1 + tm1*mm4 + tm2*mm7;
		tm[2] = tm0*mm2 + tm1*mm5 + tm2*mm8;
		tm[3] = tm3*mm0 + tm4*mm3 + tm5*mm6;
		tm[4] = tm3*mm1 + tm4*mm4 + tm5*mm7;
		tm[5] = tm3*mm2 + tm4*mm5 + tm5*mm8;
		tm[6] = tm6*mm0 + tm7*mm3 + tm8*mm6;
		tm[7] = tm6*mm1 + tm7*mm4 + tm8*mm7;
		tm[8] = tm6*mm2 + tm7*mm5 + tm8*mm8;

		return this;
	},

	/**
	 * Premultiply this matrix by a given matrix.
	 * @param m {IgeMatrix2d}
	 * @return this
	 */
	premultiply: function(m) {

		var m00 = m.matrix[0]*this.matrix[0] + m.matrix[1]*this.matrix[3] + m.matrix[2]*this.matrix[6];
		var m01 = m.matrix[0]*this.matrix[1] + m.matrix[1]*this.matrix[4] + m.matrix[2]*this.matrix[7];
		var m02 = m.matrix[0]*this.matrix[2] + m.matrix[1]*this.matrix[5] + m.matrix[2]*this.matrix[8];

		var m10 = m.matrix[3]*this.matrix[0] + m.matrix[4]*this.matrix[3] + m.matrix[5]*this.matrix[6];
		var m11 = m.matrix[3]*this.matrix[1] + m.matrix[4]*this.matrix[4] + m.matrix[5]*this.matrix[7];
		var m12 = m.matrix[3]*this.matrix[2] + m.matrix[4]*this.matrix[5] + m.matrix[5]*this.matrix[8];

		var m20 = m.matrix[6]*this.matrix[0] + m.matrix[7]*this.matrix[3] + m.matrix[8]*this.matrix[6];
		var m21 = m.matrix[6]*this.matrix[1] + m.matrix[7]*this.matrix[4] + m.matrix[8]*this.matrix[7];
		var m22 = m.matrix[6]*this.matrix[2] + m.matrix[7]*this.matrix[5] + m.matrix[8]*this.matrix[8];

		this.matrix[0] = m00;
		this.matrix[1] = m01;
		this.matrix[2] = m02;

		this.matrix[3] = m10;
		this.matrix[4] = m11;
		this.matrix[5] = m12;

		this.matrix[6] = m20;
		this.matrix[7] = m21;
		this.matrix[8] = m22;


		return this;
	},

	/**
	 * Creates a new inverse matrix from this matrix.
	 * @return {IgeMatrix2d} an inverse matrix.
	 */
	getInverse: function() {
		var tm = this.matrix;

		var m00 = tm[0],
			m01 = tm[1],
			m02 = tm[2],
			m10 = tm[3],
			m11 = tm[4],
			m12 = tm[5],
			m20 = tm[6],
			m21 = tm[7],
			m22 = tm[8],

			newMatrix = new IgeMatrix2d(),
			determinant = m00* (m11*m22 - m21*m12) - m10*(m01*m22 - m21*m02) + m20 * (m01*m12 - m11*m02);

		if  (determinant===0) {
			return null;
		}

		var m = newMatrix.matrix;

		m[0] = m11*m22-m12*m21;
		m[1] = m02*m21-m01*m22;
		m[2] = m01*m12-m02*m11;

		m[3] = m12*m20-m10*m22;
		m[4] = m00*m22-m02*m20;
		m[5] = m02*m10-m00*m12;

		m[6] = m10*m21-m11*m20;
		m[7] = m01*m20-m00*m21;
		m[8] = m00*m11-m01*m10;

		newMatrix.multiplyScalar (1/determinant);

		return newMatrix;
	},

	/**
	 * Multiply this matrix by a scalar.
	 * @param scalar {number} scalar value
	 *
	 * @return this
	 */
	multiplyScalar: function (scalar) {
		var i;

		for (i=0; i<9; i++) {
			this.matrix[i]*=scalar;
		}

		return this;
	},

	/**
	 *
	 * @param ctx
	 */
	transformRenderingContextSet: function(ctx) {
		var m = this.matrix;
		ctx.setTransform (m[0], m[3], m[1], m[4], m[2], m[5]);
		return this;
	},

	/**
	 *
	 * @param ctx
	 */
	transformRenderingContext: function(ctx) {
		var m = this.matrix;
		ctx.transform (m[0], m[3], m[1], m[4], m[2], m[5]);
		return this;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMatrix2d; };// TODO: Doc this class!
var IgeVelocityComponent = IgeClass.extend({
	classId: 'IgeVelocityComponent',
	componentId: 'velocity',

	init: function (entity, options) {
		this._entity = entity;

		this._velocity = new IgePoint(0, 0, 0);
		this._friction = new IgePoint(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehaviour('velocity', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		this.velocity.tick(ctx);
	},

	byAngleAndPower: function (radians, power, relative) {
		var vel = this._velocity,
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = 0;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	xyz: function (x, y, z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	x: function (x, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}

		return this._entity;
	},

	y: function (y, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}

		return this._entity;
	},

	z: function (z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.z = y;
		} else {
			vel.z += z;
		}

		return this._entity;
	},

	vector3: function (vector, relative) {
		if (typeof(vector.scale) !== 'number') {
			vector.scale = 1; // Default to 1
		}

		var vel = this._velocity,
			x = vector.x,
			y = vector.y,
			z = vector.z;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	friction: function (val) {
		var finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new IgePoint(finalFriction, finalFriction, finalFriction);

		return this._entity;
	},

	linearForce: function (degrees, power) {
		power /= 1000;
		var radians = (degrees * Math.PI / 180),
			x = Math.cos(radians) * power,
			y = Math.sin(radians) * power,
			z = x * y;
		this._linearForce = new IgePoint(x, y, z);

		return this._entity;
	},

	linearForceXYZ: function (x, y, z) {
		this._linearForce = new IgePoint(x, y, z);
		return this._entity;
	},

	linearForceVector3: function (vector, power, relative) {
		var force = this._linearForce = this._linearForce || new IgePoint(0, 0, 0),
			x = vector.x / 1000,
			y = vector.y / 1000,
			z = vector.z / 1000;

		if (!relative) {
			force.x = x || 0;
			force.y = y || 0;
			force.z = z || 0;
		} else {
			force.x += x || 0;
			force.y += y || 0;
			force.z += z || 0;
		}

		return this._entity;
	},

	_applyLinearForce: function (delta) {
		if (this._linearForce) {
			var vel = this._velocity;

			vel.x += (this._linearForce.x * delta);
			vel.y += (this._linearForce.y * delta);
			vel.z += (this._linearForce.z * delta);
		}
	},

	_applyFriction: function () {
		var vel = this._velocity,
			fric = this._friction;

		vel.x *= fric.x;
		vel.y *= fric.y;
		vel.z *= fric.z;
	},

	tick: function (ctx) {
		var delta = ige._tickDelta,
			vel = this._velocity,
			x, y, z;

		if (delta) {
			this._applyLinearForce(delta);
			//this._applyFriction();

			x = vel.x * delta;
			y = vel.y * delta;
			z = vel.z * delta;

			if (x || y || z) {
				this._entity.translateBy(x, y, z);
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeVelocityComponent; };/**
 * This component is already included in the IgeEngine (ige)
 * instance and is not designed for use in any other way!
 * It handles global tween processing on all tweening values.
 */
var IgeTweenComponent = IgeClass.extend({
	classId: 'IgeTweenComponent',
	componentId: 'tween',

	init: function (entity, options) {
		this._entity = entity;
		this._transform = entity.transform;

		// Setup the array that will hold our active tweens
		this._tweens = [];

		// Add the tween behaviour to the entity
		entity.addBehaviour('tween', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		this.tween.tick(ctx);
	},

	/**
	 * Start tweening particular properties for the object.
	 * @param {IgeTween} tween The tween to start.
	 * @return {Number} The index of the added tween or -1 on error.
	 */
	start: function (tween) {
		if (tween._startTime > ige._currentTime) {
			// The tween is scheduled for later
			// Push the tween into the IgeTweenComponent's _tweens array
			this._tweens.push(tween);
		} else {
			// The tween should start immediately
			tween._currentStep = 0;
			
			// Setup the tween's step
			if (this._setupStep(tween, false)) {
				// Push the tween into the IgeTweenComponent's _tweens array
				this._tweens.push(tween);
			}
		}

		// Enable tweening on the IgeTweenComponent
		this.enable();

		// Return the tween
		return tween;
	},

	_setupStep: function (tween, newTime) {
		var targetObj = tween._targetObj,
			step = tween._steps[tween._currentStep],
			propertyNameAndValue, // = tween._propertyObj
			durationMs,
			endTime,
			easing,
			propertyIndex,
			targetData = [];

		if (step) {
			propertyNameAndValue = step.props;
		}

		if (targetObj) {
			// Check / fill some option defaults
			if (tween._currentStep === 0 && !newTime) {
				// Because we are on step zero we can check for a start time
				if (tween._startTime === undefined) {
					tween._startTime = ige._currentTime;
				}
			} else {
				// We're not on step zero anymore so the new step start time
				// is NOW!
				tween._startTime = ige._currentTime;
			}

			durationMs = step.durationMs ? step.durationMs : tween._durationMs;
			tween._selectedEasing = step.easing ? step.easing : tween._easing;

			// Calculate the end time
			tween._endTime = tween._startTime + durationMs;

			for (propertyIndex in propertyNameAndValue) {
				if (propertyNameAndValue.hasOwnProperty(propertyIndex)) {
					targetData.push({
						targetObj: targetObj,
						propName: propertyIndex,
						deltaVal: propertyNameAndValue[propertyIndex] - (step.isDelta ? 0 : targetObj[propertyIndex]), // The diff between end and start values
						oldDelta: 0 // Var to save the old delta in order to get the actual difference data.
					});
				}
			}

			tween._targetData = targetData;
			tween._destTime = tween._endTime - tween._startTime;

			return tween; // Return the tween
		} else {
			this.log('Cannot start tweening properties of the specified object "' + obj + '" because it does not exist!', 'error');
		}
	},

	/**
	 * Removes the specified tween from the active tween list.
	 * @param {IgeTween} The tween to stop.
	 */
	stop: function (tween) {
		// Store the new tween details in the item
		this._tweens.pull(tween);

		if (!this._tweens.length) {
			// Disable tweening on this item as there are
			// no more tweens to process
			this.disable();
		}
		
		return this;
	},

	/**
	 * Stop all tweening for the object.
	 */
	stopAll: function () {
		// Disable tweening
		this.disable();

		// Remove all tween details
		delete this._tweens;
		this._tweens = [];

		return this;
	},

	/**
	 * Enable tweening for the object.
	 */
	enable: function () {
		// Check if the item is currently tweening
		if (!this._tweening) {
			// Set the item to tweening
			this._tweening = true;
		}

		return this;
	},

	/**
	 * Disable tweening for the object.
	 */
	disable: function () {
		// Check if the item is currently tweening
		if (this._tweening) {
			// Set the item to not tweening
			this._tweening = false;
		}

		return this;
	},

	/**
	 * Process tweening for the object.
	 */
	tick: function (ctx) {
		if (this._tweens && this._tweens.length) {
			var currentTime = ige._tickStart,
				tweens = this._tweens,
				tweenCount = tweens.length,
				tween,
				deltaTime,
				destTime,
				easing,
				item,
				targets,
				targetIndex,
				stepIndex,
				stopped;

			// Loop the item's tweens
			while (tweenCount--) {
				tween = tweens[tweenCount];
				stopped = false;

				// Check if we should be starting this tween yet
				if (tween._started || currentTime >= tween._startTime) {
					if (!tween._started) {
						// Check if the tween's step is -1 indicating no step
						// data has been set up yet
						if (tween._currentStep === -1) {
							// Setup the tween step now
							tween._currentStep = 0;
							this._setupStep(tween, false);
						}
						
						// Check if we have a beforeTween callback to fire
						if (typeof(tween._beforeTween) === 'function') {
							// Fire the beforeTween callback
							tween._beforeTween(tween);

							// Delete the callback so we don't store it any longer
							delete tween._beforeTween;
						}

						// Check if we have a beforeStep callback to fire
						if (typeof(tween._beforeStep) === 'function') {
							// Fire the beforeStep callback
							if (tween._stepDirection) {
								stepIndex = tween._steps.length - (tween._currentStep + 1);
							} else {
								stepIndex = tween._currentStep;
							}
							tween._beforeStep(tween, stepIndex);
						}

						tween._started = true;
					}

					deltaTime = currentTime - tween._startTime; // Delta from start time to current time
					destTime = tween._destTime;
					easing = tween._selectedEasing;

					// Check if the tween has reached it's destination based upon
					// the current time
					if (deltaTime >= destTime) {
						// The tween time indicates the tween has ended so set to
						// the ending value
						targets = tween._targetData;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								
								//add by the delta amount to destination
								var currentDelta = this.easing[easing](
									destTime,
									item.deltaVal,
									destTime
								);
								item.targetObj[item.propName] += currentDelta - item.oldDelta;
								
								//round the value to correct floating point operation imprecisions
								var roundingPrecision = Math.pow(10, 15-(item.targetObj[item.propName].toFixed(0).toString().length));
								item.targetObj[item.propName] = Math.round(item.targetObj[item.propName] * roundingPrecision)/roundingPrecision;
							}
						}

						// Check if we have a afterStep callback to fire
						if (typeof(tween._afterStep) === 'function') {
							// Fire the afterStep
							if (tween._stepDirection) {
								stepIndex = tween._steps.length - (tween._currentStep + 1);
							} else {
								stepIndex = tween._currentStep;
							}
							tween._afterStep(tween, stepIndex);
						}

						if (tween._steps.length === tween._currentStep + 1) {
							// The tween has ended, is the tween repeat mode enabled?
							if (tween._repeatMode) {
								// We have a repeat mode, lets check for a count
								if (tween._repeatCount !== -1) {
									// Check if the repeat count has reached the
									// number of repeats we wanted
									tween._repeatedCount++;
									if (tween._repeatCount === tween._repeatedCount) {
										// The tween has ended
										stopped = true;
									}
								}

								if (!stopped) {
									// Work out what mode we're running on
									if (tween._repeatMode === 1) {
										tween._currentStep = 0;
									}

									if (tween._repeatMode === 2) {
										// We are on "reverse loop" mode so now
										// reverse the tween's steps and then
										// start from step zero
										tween._stepDirection = !tween._stepDirection;
										tween._steps.reverse();

										tween._currentStep = 1;
									}

									// Check if we have a stepsComplete callback to fire
									if (typeof(tween._stepsComplete) === 'function') {
										// Fire the stepsComplete callback
										tween._stepsComplete(tween, tween._currentStep);
									}

									// Check if we have a beforeStep callback to fire
									if (typeof(tween._beforeStep) === 'function') {
										// Fire the beforeStep callback
										if (tween._stepDirection) {
											stepIndex = tween._steps.length - (tween._currentStep + 1);
										} else {
											stepIndex = tween._currentStep;
										}
										tween._beforeStep(tween, stepIndex);
									}

									this._setupStep(tween, true);
								}
							} else {
								stopped = true;
							}

							if (stopped) {
								// Now stop tweening this tween
								tween.stop();

								// If there is a callback, call it
								if (typeof(tween._afterTween) === 'function') {
									// Fire the afterTween callback
									tween._afterTween(tween);

									// Delete the callback so we don't store it any longer
									delete tween._afterTween;
								}
							}
						} else {
							// Start the next step
							tween._currentStep++;

							// Check if we have a beforeStep callback to fire
							if (typeof(tween._beforeStep) === 'function') {
								// Fire the beforeStep callback
								if (tween._stepDirection) {
									stepIndex = tween._steps.length - (tween._currentStep + 1);
								} else {
									stepIndex = tween._currentStep;
								}
								tween._beforeStep(tween, stepIndex);
							}

							this._setupStep(tween, true);
						}
					} else {
						// The tween is still active, process the tween by passing it's details
						// to the selected easing method
						targets = tween._targetData;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								var currentDelta = this.easing[easing](
									deltaTime,
									item.deltaVal,
									destTime
								);
								item.targetObj[item.propName] += currentDelta - item.oldDelta;
								item.oldDelta = currentDelta;
							}
						}
					}
				}
			}
		}
	},

	/** tweenEasing - Contains all the tween easing functions. {
		category:"property",
		type:"object",
	} **/
	easing: {
		// Easing equations converted from AS to JS from original source at
		// http://robertpenner.com/easing/
		none: function(t, c, d) {
			return c*t/d;
		},
		inQuad: function(t, c, d) {
			return c*(t/=d)*t;
		},
		outQuad: function(t, c, d) {
			return -c *(t/=d)*(t-2);
		},
		inOutQuad: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t; }
			return -c/2 *((--t)*(t-2) - 1);
		},
		inCubic: function(t, c, d) {
			return c*(t/=d)*t*t;
		},
		outCubic: function(t, c, d) {
			return c*((t=t/d-1)*t*t + 1);
		},
		inOutCubic: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t; }
			return c/2*((t-=2)*t*t + 2);
		},
		outInCubic: function(t, c, d) {
			if(t < d/2) { return this.outCubic(t*2, c/2, d); }
			return this.inCubic((t*2)-d, c/2, c/2, d);
		},
		inQuart: function(t, c, d) {
			return c*(t/=d)*t*t*t;
		},
		outQuart: function(t, c, d) {
			return -c *((t=t/d-1)*t*t*t - 1);
		},
		inOutQuart: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t; }
			return -c/2 *((t-=2)*t*t*t - 2);
		},
		outInQuart: function(t, c, d) {
			if(t < d/2) { return this.outQuart(t*2, c/2, d); }
			return this.inQuart((t*2)-d, c/2, c/2, d);
		},
		inQuint: function(t, c, d) {
			return c*(t/=d)*t*t*t*t;
		},
		outQuint: function(t, c, d) {
			return c*((t=t/d-1)*t*t*t*t + 1);
		},
		inOutQuint: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t*t; }
			return c/2*((t-=2)*t*t*t*t + 2);
		},
		outInQuint: function(t, c, d) {
			if(t < d/2) { return this.outQuint(t*2, c/2, d); }
			return this.inQuint((t*2)-d, c/2, c/2, d);
		},
		inSine: function(t, c, d) {
			return -c * Math.cos(t/d *(Math.PI/2)) + c;
		},
		outSine: function(t, c, d) {
			return c * Math.sin(t/d *(Math.PI/2));
		},
		inOutSine: function(t, c, d) {
			return -c/2 *(Math.cos(Math.PI*t/d) - 1);
		},
		outInSine: function(t, c, d) {
			if(t < d/2) { return this.outSine(t*2, c/2, d); }
			return this.inSine((t*2)-d, c/2, c/2, d);
		},
		inExpo: function(t, c, d) {
			return(t === 0) ? 0 : c * Math.pow(2, 10 *(t/d - 1)) - c * 0.001;
		},
		outExpo: function(t, c, d) {
			return(t === d) ? c : c * 1.001 *(-Math.pow(2, -10 * t/d) + 1);
		},
		inOutExpo: function(t, c, d) {
			if(t === 0) { return 0; }
			if(t === d) { return c; }
			if((t/=d/2) < 1) { return c/2 * Math.pow(2, 10 *(t - 1)) - c * 0.0005; }
			return c/2 * 1.0005 *(-Math.pow(2, -10 * --t) + 2);
		},
		outInExpo: function(t, c, d) {
			if(t < d/2) { return this.outExpo(t*2, c/2, d); }
			return this.inExpo((t*2)-d, c/2, c/2, d);
		},
		inCirc: function(t, c, d) {
			return -c *(Math.sqrt(1 -(t/=d)*t) - 1);
		},
		outCirc: function(t, c, d) {
			return c * Math.sqrt(1 -(t=t/d-1)*t);
		},
		inOutCirc: function(t, c, d) {
			if((t/=d/2) < 1) { return -c/2 *(Math.sqrt(1 - t*t) - 1); }
			return c/2 *(Math.sqrt(1 -(t-=2)*t) + 1);
		},
		outInCirc: function(t, c, d) {
			if(t < d/2) { return this.outCirc(t*2, c/2, d); }
			return this.inCirc((t*2)-d, c/2, c/2, d);
		},
		inElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) {return 0;}
			if((t/=d)===1) { return c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p ));
		},
		outElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) { return 0; }
			if((t/=d)===1) { return c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return(a*Math.pow(2,-10*t) * Math.sin((t*d-s)*(2*Math.PI)/p ) + c);
		},
		inOutElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) { return 0; }
			if((t/=d/2)===2) { return c; }
			if(!p) { p=d*(0.3*1.5); }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			if(t < 1) { return -0.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p)); }
			return a*Math.pow(2,-10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )*0.5 + c;
		},
		outInElastic: function(t, c, d, a, p) {
			if(t < d/2) { return this.outElastic(t*2, c/2, d, a, p); }
			return this.inElastic((t*2)-d, c/2, c/2, d, a, p);
		},
		inBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*(t/=d)*t*((s+1)*t - s);
		},
		outBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1);
		},
		inOutBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			if((t/=d/2) < 1) { return c/2*(t*t*(((s*=(1.525))+1)*t - s)); }
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
		},
		outInBack: function(t, c, d, s) {
			if(t < d/2) { return this.outBack(t*2, c/2, d, s); }
			return this.inBack((t*2)-d, c/2, c/2, d, s);
		},
		inBounce: function(t, c, d) {
			return c - this.outBounce(d-t, 0, c, d);
		},
		outBounce: function(t, c, d) {
			if((t/=d) <(1/2.75)) {
				return c*(7.5625*t*t);
			} else if(t <(2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + 0.75);
			} else if(t <(2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375);
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375);
			}
		},
		inOutBounce: function(t, c, d) {
			if(t < d/2) {
				return this.inBounce(t*2, 0, c, d) * 0.5;
			} else {
				return this.outBounce(t*2-d, 0, c, d) * 0.5 + c*0.5;
			}
		},
		outInBounce: function(t, c, d) {
			if(t < d/2) { return this.outBounce(t*2, c/2, d); }
			return this.inBounce((t*2)-d, c/2, c/2, d);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTweenComponent; };var IgeInputComponent = IgeEventingClass.extend({
	classId: 'IgeInputComponent',
	componentId: 'input',

	init: function () {
		// Setup the input objects to hold the current input state
		this._eventQueue = [];
		this._eventControl = {
			_cancelled: false,
			stopPropagation: function () {
				this._cancelled = true;
			}
		};

		this.tick();

		this.mouse = {
			// Virtual codes
			dblClick: -302,
			down: -301,
			up: -300,
			move: -259,
			wheel: -258,
			wheelUp: -257,
			wheelDown: -256,
			x: -255,
			y: -254,
			button1: -253,
			button2: -252,
			button3: -251
		};

		this.pad1 = {
			// Virtual codes
			button1: -250,
			button2: -249,
			button3: -248,
			button4: -247,
			button5: -246,
			button6: -245,
			button7: -244,
			button8: -243,
			button9: -242,
			button10: -241,
			button11: -240,
			button12: -239,
			button13: -238,
			button14: -237,
			button15: -236,
			button16: -235,
			button17: -234,
			button18: -233,
			button19: -232,
			button20: -231,
			stick1: -230,
			stick2: -229,
			stick1Up: -228,
			stick1Down: -227,
			stick1Left: -226,
			stick1Right: -225,
			stick2Up: -224,
			stick2Down: -223,
			stick2Left: -222,
			stick2Right: -221
		};

		this.pad2 = {
			// Virtual codes
			button1: -220,
			button2: -219,
			button3: -218,
			button4: -217,
			button5: -216,
			button6: -215,
			button7: -214,
			button8: -213,
			button9: -212,
			button10: -211,
			button11: -210,
			button12: -209,
			button13: -208,
			button14: -207,
			button15: -206,
			button16: -205,
			button17: -204,
			button18: -203,
			button19: -202,
			button20: -201,
			stick1: -200,
			stick2: -199,
			stick1Up: -198,
			stick1Down: -197,
			stick1Left: -196,
			stick1Right: -195,
			stick2Up: -194,
			stick2Down: -193,
			stick2Left: -192,
			stick2Right: -191
		};

		// Keycodes from http://www.asciitable.com/
		// and general console.log efforts :)
		this.key = {
			// Virtual codes
			'shift': -3,
			'ctrl': -2,
			'alt': -1,
			// Read codes
			'backspace': 8,
			'tab': 9,
			'enter': 13,
			'escape': 27,
			'space': 32,
			'pageUp': 33,
			'pageDown': 34,
			'end': 35,
			'home': 36,
			'left': 37,
			'up': 38,
			'right': 39,
			'down': 40,
			'insert': 45,
			'del': 46,
			'0': 48,
			'1': 49,
			'2': 50,
			'3': 51,
			'4': 52,
			'5': 53,
			'6': 54,
			'7': 55,
			'8': 56,
			'9': 57,
			'a': 65,
			'b': 66,
			'c': 67,
			'd': 68,
			'e': 69,
			'f': 70,
			'g': 71,
			'h': 72,
			'i': 73,
			'j': 74,
			'k': 75,
			'l': 76,
			'm': 77,
			'n': 78,
			'o': 79,
			'p': 80,
			'q': 81,
			'r': 82,
			's': 83,
			't': 84,
			'u': 85,
			'v': 86,
			'w': 87,
			'x': 88,
			'y': 89,
			'z': 90
		};

		this._controlMap = [];
		this._state = [];

		// Set default values for the mouse position
		this._state[this.mouse.x] = 0;
		this._state[this.mouse.y] = 0;
	},

	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	},

	/**
	 * Sets up the event listeners on the main window and front
	 * buffer DOM objects.
	 * @private
	 */
	setupListeners: function (canvas) {
		this.log('Setting up input event listeners...');

		this._canvas = canvas;

		// Setup the event listeners
		var self = this;

		// Define event functions and keep references for later removal
		this._evRef = {
			'mousedown': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseDown(event); },
			'mouseup': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseUp(event); },
			'mousemove': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseMove(event); },
			'mousewheel': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseWheel(event); },

			'touchmove': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseMove(event); },
			'touchstart': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseDown(event); },
			'touchend': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseUp(event); },

			'contextmenu': function (event) { event.preventDefault(); },

			'keydown': function (event) { event.igeType = 'key'; self._rationalise(event); self._keyDown(event); },
			'keyup': function (event) { event.igeType = 'key'; self._rationalise(event); self._keyUp(event); }
		};

		// Listen for mouse events
		canvas.addEventListener('mousedown', this._evRef.mousedown, false);
		canvas.addEventListener('mouseup', this._evRef.mouseup, false);
		canvas.addEventListener('mousemove', this._evRef.mousemove, false);
		canvas.addEventListener('mousewheel', this._evRef.mousewheel, false);

		// Touch events
		canvas.addEventListener('touchmove', this._evRef.touchmove, false);
		canvas.addEventListener('touchstart', this._evRef.touchstart, false);
		canvas.addEventListener('touchend', this._evRef.touchend, false);

		// Kill the context menu on right-click, urgh!
		canvas.addEventListener('contextmenu', this._evRef.contextmenu, false);

		// Listen for keyboard events
		window.addEventListener('keydown', this._evRef.keydown, false);
		window.addEventListener('keyup', this._evRef.keyup, false);
	},

	destroyListeners: function () {
		this.log('Removing input event listeners...');

		// Remove the event listeners
		var canvas = this._canvas;

		// Listen for mouse events
		canvas.removeEventListener('mousedown', this._evRef.mousedown, false);
		canvas.removeEventListener('mouseup', this._evRef.mouseup, false);
		canvas.removeEventListener('mousemove', this._evRef.mousemove, false);
		canvas.removeEventListener('mousewheel', this._evRef.mousewheel, false);

		// Touch events
		canvas.removeEventListener('touchmove', this._evRef.touchmove, false);
		canvas.removeEventListener('touchstart', this._evRef.touchstart, false);
		canvas.removeEventListener('touchend', this._evRef.touchend, false);

		// Kill the context menu on right-click, urgh!
		canvas.removeEventListener('contextmenu', this._evRef.contextmenu, false);

		// Listen for keyboard events
		window.removeEventListener('keydown', this._evRef.keydown, false);
		window.removeEventListener('keyup', this._evRef.keyup, false);
	},

	/**
	 * Sets igeX and igeY properties in the event object that
	 * can be relied on to provide the x, y co-ordinates of the
	 * mouse event including the canvas offset.
	 * @param {Event} event The event object.
	 * @param {Boolean} touch If the event was a touch event or
	 * not.
	 * @private
	 */
	_rationalise: function (event, touch) {
		// Check if we want to prevent default behaviour
		if (event.igeType === 'key') {
			if (event.keyCode === 8) { // Backspace
				// Check if the event occurred on the body
				var elem = event.srcElement || event.target;

				if (elem.tagName.toLowerCase() === 'body') {
					// The event occurred on our body element so prevent
					// default behaviour. This allows other elements on
					// the page to retain focus such as text boxes etc
					// and allows them to behave normally.
					event.preventDefault();
				}
			}
		}

		if (event.igeType === 'touch') {
			event.preventDefault();
		}

		if (touch) {
			event.button = 0; // Emulate left mouse button

			// Handle touch changed
			if (event.changedTouches && event.changedTouches.length) {
				event.igePageX = event.changedTouches[0].pageX;
				event.igePageY = event.changedTouches[0].pageY;
			}
		} else {
			event.igePageX = event.pageX;
			event.igePageY = event.pageY;
		}

		event.igeX = (event.igePageX - this._canvas.offsetLeft);
		event.igeY = (event.igePageY - this._canvas.offsetTop);

		this.emit('inputEvent', event);
	},


	/**
	 * Emits the "mouseDown" event.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (this._debug) {
			console.log('Mouse Down', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige._geometry.x2,
			my = event.igeY - ige._geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		if (event.button === 0) {
			this._state[this.mouse.button1] = true;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = true;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = true;
		}

		this.mouseDown = event;

		this.queueEvent(this, function () {
			self.emit('mouseDown', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseUp" event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._debug) {
			console.log('Mouse Up', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige._geometry.x2,
			my = event.igeY - ige._geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.mouseUp = event;

		this.queueEvent(this, function () {
			self.emit('mouseUp', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseMove" event.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		// Update the mouse position within the viewports
		ige._mouseOverVp = this._updateMouseData(event);

		var mx = event.igeX - ige._geometry.x2,
			my = event.igeY - ige._geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		this._state[this.mouse.x] = mx;
		this._state[this.mouse.y] = my;

		this.mouseMove = event;

		this.queueEvent(this, function () {
			self.emit('mouseMove', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseWheel" event.
	 * @param event
	 * @private
	 */
	_mouseWheel: function (event) {
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige._geometry.x2,
			my = event.igeY - ige._geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		this._state[this.mouse.wheel] = event.wheelDelta;

		if (event.wheelDelta > 0) {
			this._state[this.mouse.wheelUp] = true;
		} else {
			this._state[this.mouse.wheelDown] = true;
		}

		this.mouseWheel = event;

		this.queueEvent(this, function () {
			self.emit('mouseWheel', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "keyDown" event.
	 * @param event
	 * @private
	 */
	_keyDown: function (event) {
		var self = this;

		this._state[event.keyCode] = true;
		this.queueEvent(this, function () {
			self.emit('keyDown', [event, event.keyCode]);
		});
	},

	/**
	 * Emits the "keyUp" event.
	 * @param event
	 * @private
	 */
	_keyUp: function (event) {
		var self = this;

		this._state[event.keyCode] = false;
		this.queueEvent(this, function () {
			self.emit('keyUp', [event, event.keyCode]);
		});
	},

	/**
	 * Loops the mounted viewports and updates their respective mouse
	 * co-ordinates so that mouse events can work out where on a viewport
	 * they occurred.
	 *
	 * @param event
	 * @return {*}
	 * @private
	 */
	_updateMouseData: function (event) {
		// Loop the viewports and check if the mouse is inside
		var arr = ige._children,
			arrCount = arr.length,
			vp, vpUpdated,
			mx = event.igeX - ige._geometry.x / 2,
			my = event.igeY - ige._geometry.y / 2;

		ige._mousePos.x = mx;
		ige._mousePos.y = my;

		while (arrCount--) {
			vp = arr[arr.length - (arrCount + 1)];
			// Check if the mouse is inside this viewport's bounds
			// TODO: Update this code to take into account viewport rotation and camera rotation
			if (mx > vp._translate.x - vp._geometry.x / 2 && mx < vp._translate.x + vp._geometry.x / 2) {
				if (my > vp._translate.y - vp._geometry.y / 2 && my < vp._translate.y + vp._geometry.y / 2) {
					// Mouse is inside this viewport
					vp._mousePos = new IgePoint(
						Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
						Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
						0
					);

					vpUpdated = vp;

					// Record the viewport that this event occurred on in the
					// event object
					event.igeViewport = vp;
					break;
				}
			}
		}

		return vpUpdated;
	},

	/**
	 * Defines an action that will be emitted when the specified event type
	 * occurs.
	 * @param actionName
	 * @param eventCode
	 */
	mapAction: function (actionName, eventCode) {
		this._controlMap[actionName] = eventCode;
	},

	/**
	 * Returns the passed action's input state value.
	 * @param actionName
	 */
	actionVal: function (actionName) {
		return this._state[this._controlMap[actionName]];
	},

	/**
	 * Returns true if the passed action's input is pressed or it's state
	 * is not zero.
	 * @param actionName
	 */
	actionState: function (actionName) {
		var val = this._state[this._controlMap[actionName]];
		return !!val; // "Not not" to convert to boolean true/false
	},

	/**
	 * Returns an input's current value.
	 * @param actionName
	 * @return {*}
	 */
	val: function (inputId) {
		return this._state[inputId];
	},

	/**
	 * Returns an input's current state as a boolean.
	 * @param stateId
	 * @return {Boolean}
	 */
	state: function (inputId) {
		return !!this._state[inputId];
	},

	/**
	 * Stops further event propagation for this tick.
	 * @return {*}
	 */
	stopPropagation: function () {
		this._eventControl._cancelled = true;
		return this;
	},

	/**
	 * Adds an event method to the eventQueue array. The array is
	 * processed during each tick after the scenegraph has been
	 * rendered.
	 * @param context
	 * @param ev
	 */
	queueEvent: function (context, ev, data) {
		if (ev !== undefined) {
			this._eventQueue.push([context, ev, data]);
		}

		return this;
	},

	/**
	 * Called by the engine after ALL other tick methods have processed.
	 * Call originates in IgeEngine.js. Allows us to reset any flags etc.
	 */
	tick: function () {
		// If we have an event queue, process it
		var arr = this._eventQueue,
			arrCount = arr.length,
			evc = this._eventControl;

		while (arrCount--) {
			arr[arrCount][1].apply(arr[arrCount][0], [evc, arr[arrCount][2]]);
			if (evc._cancelled) {
				// The last event queue method stopped propagation so cancel all further
				// event processing (the last event took control of the input)
				break;
			}
		}

		// Reset all the flags and variables for the next tick
		this._eventQueue = [];
		this._eventControl._cancelled = false;
		this.dblClick = false; // TODO: Add double-click event handling
		this.mouseMove = false;
		this.mouseDown = false;
		this.mouseUp = false;
		this.mouseWheel = false;
	},

	/**
	 * Emit an event by name. Overrides the IgeEventingClass emit method and
	 * checks for propagation stopped by calling ige.input.stopPropagation().
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} args The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {

				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length,
					eventCount2 = this._eventListeners[eventName].length - 1,
					evc = this._eventControl,
					finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					finalArgs = [];
					if (typeof(args) === 'object' && args !== null && args[0] !== null) {
						for (i in args) {
							if (args.hasOwnProperty(i)) {
								finalArgs[i] = args[i];
							}
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					cancelFlag = false;

					this._eventListeners._processing = true;
					while (eventCount--) {
						if (evc._cancelled) {
							// The stopPropagation() method was called, cancel all other event calls
							break;
						}
						eventIndex = eventCount2 - eventCount;
						tempEvt = this._eventListeners[eventName][eventIndex];

						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) { finalArgs = [eventName]; }

						// Call the callback
						retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						if (retVal === true || evc._cancelled === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							this.off(eventName, tempEvt);
						}
					}
					this._eventListeners._processing = false;

					// Now process any event removal
					this._processRemovals();

					if (cancelFlag) {
						return 1;
					}

				}

			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInputComponent; };var IgeCocoonJsComponent = IgeEventingClass.extend({
	classId: 'IgeCocoonJsComponent',
	componentId: 'cocoonJs',

	init: function () {
		this.detected = typeof(ext) !== 'undefined' && typeof(ext.IDTK_APP) !== 'undefined';

		if (this.detected) {
			this.log('CocoonJS support enabled!');
		}
	},

	// TODO: Finish keyboard implementation
	showInputDialog: function(title, message, initialValue, type, cancelText, okText) {
		if (this.detected) {
			title = title || '';
			message = message || '';
			initialValue = initialValue || '';
			type = type || 'text';
			cancelText = cancelText || 'Cancel';
			okText = okText || 'OK';

			ext.IDTK_APP.makeCall(
				'showTextDialog',
				title,
				message,
				initialValue,
				type,
				cancelText,
				okText
			);
		} else {
			this.log('Cannot open CocoonJS input dialog! CocoonJS is not detected!', 'error');
		}
	},

	/**
	 * Asks the API to load the url and show the web view.
	 * @param url
	 */
	showWebView: function (url) {
		if (this.detected) {
			// Forward a JS call to the webview IDTK API
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('loadPath', '" + url + "')");
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('show');");
		}
	},

	/**
	 * Asks the API to hide the web view.
	 */
	hideWebView: function () {
		if (this.detected) {
			// Forward a JS call to the webview IDTK API
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('hide');");
		}
	}
});;var IgeUiPositionExtension = {
	/**
	 * Gets / sets the viewport's x position relative to the left of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	left: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'left';

			this._updateUiPosition();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the center of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	center: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'center';

			this._updateUiPosition();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the right of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	right: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'right';

			this._updateUiPosition();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's y position relative to the top of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	top: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'top';

			this._updateUiPosition();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the middle of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	middle: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'middle';

			this._updateUiPosition();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the bottom of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	bottom: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'bottom';

			this._updateUiPosition();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the geometry.x in pixels.
	 * @param {Number, String=} px Either the width in pixels or a percentage
	 * @param {Number=} modifier A value to add to the final width. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @return {*}
	 */
	width: function (px, lockAspect, modifier, noUpdate) {
		if (px !== undefined) {
			this._uiWidth = px;
			this._widthModifier = modifier !== undefined ? modifier : 0;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentWidth = this._parent._geometry.x,
						val = parseInt(px, 10),
						newVal,
						ratio;

					// Calculate real width from percentage
					newVal = (parentWidth / 100 * val) + this._widthModifier | 0;

					if (lockAspect) {
						// Calculate the height from the change in width
						ratio = newVal / this._geometry.x;
						this.height(this._geometry.y / ratio, false, 0, noUpdate);
					}

					this._width = newVal;
					this._geometry.x = newVal;
					this._geometry.x2 = Math.floor(this._geometry.x / 2);
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentWidth = ige._geometry.x,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this._geometry.x = (parentWidth / 100 * val) + this._widthModifier | 0;
					this._geometry.x2 = Math.floor(this._geometry.x / 2);

					this._width = this._geometry.x;
				}
			} else {
				if (lockAspect) {
					// Calculate the height from the change in width
					var ratio = px / this._geometry.x;
					this.height(this._geometry.y * ratio, false, 0, noUpdate);
				}

				this._width = px;
				this._geometry.x = px;
				this._geometry.x2 = Math.floor(this._geometry.x / 2);
			}

			if (!noUpdate) {
				this._updateUiPosition();
			}
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry.y in pixels.
	 * @param {Number=} px
	 * @param {Number=} modifier A value to add to the final height. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @return {*}
	 */
	height: function (px, lockAspect, modifier, noUpdate) {
		if (px !== undefined) {
			this._uiHeight = px;
			this._heightModifier = modifier !== undefined ? modifier : 0;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentHeight = this._parent._geometry.y,
						val = parseInt(px, 10),
						newVal,
						ratio;

					// Calculate real height from percentage
					// Calculate real width from percentage
					newVal = (parentHeight / 100 * val) + this._heightModifier | 0;

					if (lockAspect) {
						// Calculate the height from the change in width
						ratio = newVal / this._geometry.y;
						this.width(this._geometry.x / ratio, false, 0, noUpdate);
					}

					this._height = newVal;
					this._geometry.y = newVal;
					this._geometry.y2 = Math.floor(this._geometry.y / 2);
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentHeight = ige._geometry.y,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this._geometry.y = (parentHeight / 100 * val) + this._heightModifier | 0;
					this._geometry.y2 = Math.floor(this._geometry.y / 2);
					this._height = this._geometry.y;
				}
			} else {
				if (lockAspect) {
					// Calculate the height from the change in width
					var ratio = px / this._geometry.y;
					this.width(this._geometry.x * ratio, false, 0, noUpdate);
				}

				this._height = px;
				this._geometry.y = px;
				this._geometry.y2 = Math.floor(this._geometry.y / 2);
			}

			if (!noUpdate) {
				this._updateUiPosition();
			}
			return this;
		}

		return this._height;
	},
	
	autoScaleX: function (val, lockAspect) {
		if (val !== undefined) {
			this._autoScaleX = val;
			this._autoScaleLockAspect = lockAspect;

			this._updateUiPosition();
			return this;
		}

		return this._autoScaleX;
	},

	autoScaleY: function (val, lockAspect) {
		if (val !== undefined) {
			this._autoScaleY = val;
			this._autoScaleLockAspect = lockAspect;

			this._updateUiPosition();
			return this;
		}

		return this._autoScaleY;
	},

	/**
	 * Sets the correct translate x and y for the viewport's left, right
	 * top and bottom co-ordinates.
	 * @private
	 */
		// TODO: Update so that it takes into account the parent element's position etc
	_updateUiPosition: function () {
		if (this._parent) {
			var parentGeom = this._parent._geometry,
				geomScaled = this._geometry.multiplyPoint(this._scale),
				percent,
				newVal,
				ratio;
			
			if (this._autoScaleX) {
				// Get the percentage as an integer
				percent = parseInt(this._autoScaleX, 10);
	
				// Calculate new width from percentage
				newVal = (parentGeom.x / 100 * percent);
	
				// Calculate scale ratio
				ratio = newVal / this._geometry.x;
	
				// Set the new scale
				this._scale.x = ratio;
				
				if (this._autoScaleLockAspect) {
					this._scale.y = ratio;
				}
			}

			if (this._autoScaleY) {
				// Get the percentage as an integer
				percent = parseInt(this._autoScaleY, 10);

				// Calculate new height from percentage
				newVal = (parentGeom.y / 100 * percent);

				// Calculate scale ratio
				ratio = newVal / this._geometry.y;

				// Set the new scale
				this._scale.y = ratio;

				if (this._autoScaleLockAspect) {
					this._scale.x = ratio;
				}
			}

			if (this._uiWidth) { this.width(this._uiWidth, false, this._widthModifier, true); }
			if (this._uiHeight) { this.height(this._uiHeight, false, this._heightModifier, true); }

			if (this._uiXAlign === 'right') {
				this._translate.x = Math.floor(parentGeom.x2 - geomScaled.x2 - this._uiX);
			} else if (this._uiXAlign === 'center') {
				this._translate.x = Math.floor(this._uiX);
			} else if (this._uiXAlign === 'left') {
				this._translate.x = Math.floor(this._uiX + geomScaled.x2 - (parentGeom.x2));
			}

			if (this._uiYAlign === 'bottom') {
				this._translate.y = Math.floor(parentGeom.y2 - geomScaled.y2 - this._uiY);
			} else if (this._uiYAlign === 'middle') {
				this._translate.y = Math.floor(this._uiY);
			} else if (this._uiYAlign === 'top') {
				this._translate.y = Math.floor(this._uiY + geomScaled.y2 - (parentGeom.y2));
			}

			this.dirty(true);
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionExtension; };// TODO: Add "overflow" with automatic scroll-bars
var IgeUiStyleExtension = {
	/**
	 * Sets the current background texture and the repeatType
	 * to determine in which axis the image should be repeated.
	 * Accepts "repeat", "repeat-x", "repeat-y" and "no-repeat".
	 * @param {IgeTexture=} texture
	 * @param {String=} repeatType
	 * @return {*} Returns this if any parameter is specified or
	 * the current background image if no parameters are specified.
	 */
	backgroundImage: function (texture, repeatType) {
		if (texture && texture.image) {
			if (!repeatType) { repeatType = 'no-repeat'; }

			// Store the repeatType
			this._patternRepeat = repeatType;

			// Store the texture
			this._patternTexture = texture;

			// Resize the image if required
			if (this._backgroundSize) {
				texture.resize(this._backgroundSize.x, this._backgroundSize.y);
				this._patternWidth = this._backgroundSize.x;
				this._patternHeight = this._backgroundSize.y;
			} else {
				this._patternWidth = texture.image.width;
				this._patternHeight = texture.image.height;
			}

			if (this._cell > 1) {
				// We are using a cell sheet, render the cell to a
				// temporary canvas and set that as the pattern image
				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d'),
					cellData = texture._cells[this._cell];

				canvas.width = cellData[2];
				canvas.height = cellData[3];

				ctx.drawImage(
					texture.image,
					cellData[0],
					cellData[1],
					cellData[2],
					cellData[3],
					0,
					0,
					cellData[2],
					cellData[3]
				);

				// Create the pattern from the texture cell
				this._patternFill = ige._ctx.createPattern(canvas, repeatType);
			} else {
				// Create the pattern from the texture
				this._patternFill = ige._ctx.createPattern(texture.image, repeatType);
			}

			texture.restoreOriginal();
			this.dirty(true);
			return this;
		}

		return this._patternFill;
	},

	backgroundSize: function (x, y) {
		if (x !== undefined && y !== undefined) {
			if (typeof(x) === 'string') {
				// Work out the actual size in pixels
				// from the percentage
				x = this._geometry.x / 100 * parseInt(x, 10);
			}

			if (typeof(y) === 'string') {
				// Work out the actual size in pixels
				// from the percentage
				y = this._geometry.y / 100 * parseInt(y, 10);
			}
			this._backgroundSize = {x: x, y: y};

			// Reset the background image
			if (this._patternTexture && this._patternRepeat) {
				this.backgroundImage(this._patternTexture, this._patternRepeat);
			}
			this.dirty(true);
			return this;
		}

		return this._backgroundSize;
	},

	/**
	 * Gets / sets the color to use as a background when
	 * rendering the UI element.
	 * @param {CSSColor, CanvasGradient, CanvasPattern=} color
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundColor: function (color) {
		if (color !== undefined) {
			this._backgroundColor = color;
			this.dirty(true);
			return this;
		}

		return this._backgroundColor;
	},

	/**
	 * Gets / sets the position to start rendering the background image at.
	 * @param {Number=} x
	 * @param {Number=} y
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundPosition: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._backgroundPosition = {x: x, y: y};
			this.dirty(true);
			return this;
		}

		return this._backgroundPosition;
	},

	borderColor: function (color) {
		if (color !== undefined) {
			this._borderColor = color;
			this._borderLeftColor = color;
			this._borderTopColor = color;
			this._borderRightColor = color;
			this._borderBottomColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderColor;
	},

	borderLeftColor: function (color) {
		if (color !== undefined) {
			this._borderLeftColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderLeftColor;
	},

	borderTopColor: function (color) {
		if (color !== undefined) {
			this._borderTopColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderTopColor;
	},

	borderRightColor: function (color) {
		if (color !== undefined) {
			this._borderRightColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderRightColor;
	},

	borderBottomColor: function (color) {
		if (color !== undefined) {
			this._borderBottomColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderBottomColor;
	},

	borderWidth: function (px) {
		if (px !== undefined) {
			this._borderWidth = px;
			this._borderLeftWidth = px;
			this._borderTopWidth = px;
			this._borderRightWidth = px;
			this._borderBottomWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderWidth;
	},

	borderLeftWidth: function (px) {
		if (px !== undefined) {
			this._borderLeftWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderLeftWidth;
	},

	borderTopWidth: function (px) {
		if (px !== undefined) {
			this._borderTopWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderTopWidth;
	},

	borderRightWidth: function (px) {
		if (px !== undefined) {
			this._borderRightWidth = px;

			this.dirty(true);
			return this;
		}

		return this._borderRightWidth;
	},

	borderBottomWidth: function (px) {
		if (px !== undefined) {
			this._borderBottomWidth = px;

			this.dirty(true);
			return this;
		}

		return this._borderBottomWidth;
	},

	borderRadius: function (px) {
		if (px !== undefined) {
			this._borderRadius = px;
			this._borderTopLeftRadius = px;
			this._borderTopRightRadius = px;
			this._borderBottomRightRadius = px;
			this._borderBottomLeftRadius = px;

			this.dirty(true);
			return this;
		}

		return this._borderRadius;
	},

	padding: function (left, top, right, bottom) {
		this._paddingLeft = left;
		this._paddingTop = top;
		this._paddingRight = right;
		this._paddingBottom = bottom;

		this.dirty(true);
		return this;
	},

	paddingLeft: function (px) {
		if (px !== undefined) {
			this._paddingLeft = px;

			this.dirty(true);
			return this;
		}

		return this._paddingLeft;
	},

	paddingTop: function (px) {
		if (px !== undefined) {
			this._paddingTop = px;

			this.dirty(true);
			return this;
		}

		return this._paddingTop;
	},

	paddingRight: function (px) {
		if (px !== undefined) {
			this._paddingRight = px;

			this.dirty(true);
			return this;
		}

		return this._paddingRight;
	},

	paddingBottom: function (px) {
		if (px !== undefined) {
			this._paddingBottom = px;

			this.dirty(true);
			return this;
		}

		return this._paddingBottom;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiStyleExtension; };var nullMethod = function () {},
	IgeDummyContext = {
		dummy: true,
		save: nullMethod,
		restore: nullMethod,
		translate: nullMethod,
		rotate: nullMethod,
		scale: nullMethod,
		drawImage: nullMethod,
		fillRect: nullMethod,
		strokeRect: nullMethod,
		stroke: nullMethod,
		fill: nullMethod,
		rect: nullMethod,
		moveTo: nullMethod,
		lineTo: nullMethod,
		arc: nullMethod,
		clearRect: nullMethod,
		beginPath: nullMethod,
		clip: nullMethod,
		transform: nullMethod,
		setTransform: nullMethod,
		fillText: nullMethod
	};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeDummyContext; };/**
 * Creates a new tween instance.
 */
var IgeTween = IgeClass.extend({
	classId: 'IgeTween',

	init: function (targetObj, propertyObj, durationMs, options) {
		// Create a new tween object and return it
		// so the user can decide when to start it
		this._targetObj = targetObj;
		this._steps = [];
		this._currentStep = -1;
		if (propertyObj !== undefined) { this.stepTo(propertyObj); }
		this._durationMs = durationMs !== undefined ? durationMs : 0;
		this._started = false;
		this._stepDirection = false;

		// Sort out the options
		if (options && options.easing) { this.easing(options.easing); } else { this.easing('none'); }
		if (options && options.startTime !== undefined) { this.startTime(options.startTime); }
		if (options && options.beforeTween !== undefined) { this.beforeTween(options.beforeTween); }
		if (options && options.afterTween !== undefined) { this.afterTween(options.afterTween); }
	},

	/**
	 * Sets the object in which the properties to tween exist.
	 * @param targetObj
	 * @return {*}
	 */
	targetObj: function (targetObj) {
		if (targetObj !== undefined) {
			this._targetObj = targetObj;
		}

		return this;
	},

	/**
	 * Sets the tween's target properties to tween to.
	 * @param propertyObj
	 * @return {*}
	 */
	properties: function (propertyObj) {
		if (propertyObj !== undefined) {
			// Reset any existing steps and add this new one
			this._steps = [];
			this._currentStep = -1;
			this.stepTo(propertyObj);
		}

		return this;
	},

	/**
	 * Gets / sets the repeat mode for the tween. If the mode
	 * is set to 1 the tween will repeat from the first step.
	 * If set to 2 the tween will reverse the order of the steps
	 * each time the repeat occurs. The count determines the
	 * number of times the tween will be repeated before stopping.
	 * Setting the count to -1 will make it repeat infinitely.
	 * @param val
	 * @param count
	 * @return {*}
	 */
	repeatMode: function (val, count) {
		if (val !== undefined) {
			this._repeatMode = val;
			this.repeatCount(count);
			return this;
		}

		return this._repeatMode;
	},

	/**
	 * Gets / sets the repeat count. The count determines the
	 * number of times the tween will be repeated before stopping.
	 * Setting the count to -1 will make it repeat infinitely.
	 * This setting is used in conjunction with the repeatMode()
	 * method. If you just set a repeat count and no mode then
	 * the tween will not repeat.
	 * @param val
	 * @return {*}
	 */
	repeatCount: function (val) {
		if (val !== undefined) {
			this._repeatCount = val;
			this._repeatedCount = 0;
			return this;
		}

		return this._repeatCount;
	},

	/**
	 * DEPRECIATED, Renamed to stepTo().
	 */
	step: function (propertyObj, durationMs, easing) {
		this.log('The step method has been renamed to stepTo(). Please update your code as the step() method will soon be removed.', 'warning');
		this.stepTo(propertyObj, durationMs, easing);
		return this;
	},

	/**
	 * Defines a step in a multi-stage tween. Uses the properties
	 * as destination value.
	 * @param {Object} propertyObj The properties to
	 * tween during this step.
	 * @param {Number=} durationMs The number of milliseconds
	 * to spend tweening this step, or if not provided uses
	 * the current tween durationMs setting.
	 * @param {String=} easing The name of the easing method
	 * to use during this step.
	 * @return {*}
	 */
	stepTo: function (propertyObj, durationMs, easing) {
		if (propertyObj !== undefined) {
			// Check if we have already been given a standard
			// non-staged property
			this._steps.push({
				props: propertyObj,
				durationMs: durationMs,
				easing: easing,
				isDela: false
			});
		}

		return this;
	},
	
	/**
	 * Defines a step in a multi-stage tween. Uses the properties
	 * as deltas, not as destination values
	 * @param {Object} propertyObj The properties to
	 * tween during this step.
	 * @param {Number=} durationMs The number of milliseconds
	 * to spend tweening this step, or if not provided uses
	 * the current tween durationMs setting.
	 * @param {String=} easing The name of the easing method
	 * to use during this step.
	 * @return {*}
	 */
	stepBy: function (propertyObj, durationMs, easing) {
		this.stepTo(propertyObj, durationMs, easing);
		this._steps[this._steps.length - 1].isDelta = true;
		
		return this;
	},

	/**
	 * Sets the duration of the tween in milliseconds.
	 * @param durationMs
	 * @return {*}
	 */
	duration: function (durationMs) {
		if (durationMs !== undefined) {
			this._durationMs = durationMs;
		}

		return this;
	},

	/**
	 * Sets the method to be called just before the tween has started.
	 * @param callback
	 * @return {*}
	 */
	beforeTween: function (callback) {
		if (callback !== undefined) {
			this._beforeTween = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just after the tween has ended.
	 * @param callback
	 * @return {*}
	 */
	afterTween: function (callback) {
		if (callback !== undefined) {
			this._afterTween = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just before a tween step has
	 * started.
	 * @param callback
	 * @return {*}
	 */
	beforeStep: function (callback) {
		if (callback !== undefined) {
			this._beforeStep = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just after a tween step has
	 * ended.
	 * @param callback
	 * @return {*}
	 */
	afterStep: function (callback) {
		if (callback !== undefined) {
			this._afterStep = callback;
		}

		return this;
	},

	/**
	 * Sets the name of the easing method to use with the tween.
	 * @param methodName
	 * @return {*}
	 */
	easing: function (methodName) {
		if (methodName !== undefined) {
			this._easing = methodName;
		}

		return this;
	},

	/**
	 * Sets the timestamp at which the tween should start.
	 * @param timeMs
	 * @return {*}
	 */
	startTime: function (timeMs) {
		if (timeMs !== undefined) {
			this._startTime = timeMs;
		}

		return this;
	},

	/**
	 * Starts the tweening operation.
	 * @param {Number=} timeMs If set, the tween will start this
	 * many milliseconds in the future.
	 */
	start: function (timeMs) {
		if (timeMs !== undefined) {
			this.startTime(timeMs + ige._currentTime);
		}
		
		ige.tween.start(this);

		// Add the tween to the target object's tween array
		this._targetObj._tweenArr = this._targetObj._tweenArr || [];
		this._targetObj._tweenArr.push(this);

		return this;
	},

	/**
	 * Stops the tweening operation.
	 */
	stop: function () {
		ige.tween.stop(this);
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.pull(this);
		}

		return this;
	},

	/**
	 * Starts all tweens registered to an object.
	 * @private
	 */
	startAll: function () {
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.eachReverse(function (tweenItem) {
				tweenItem.start();
			});
		}

		return this;
	},

	/**
	 * Stops all tweens registered to an object.
	 * @private
	 */
	stopAll: function () {
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.eachReverse(function (tweenItem) {
				tweenItem.stop();
			});
		}

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTween; };/**
 * Creates a new texture.
 */
var IgeTexture = IgeEventingClass.extend({
	classId: 'IgeTexture',
	IgeTexture: true,

	/**
	 * Constructor for a new IgeTexture.
	 * @param {String, Object} urlOrObject Either a string URL that
	 * points to the path of the image or script you wish to use as
	 * the texture image, or an object containing a smart texture.
	 * @return {*}
	 */
	init: function (urlOrObject) {
		

		// Create an array that is used to store cell dimensions
		this._cells = [];
		this._smoothing = ige._globalSmoothing;

		var type = typeof(urlOrObject);

		if (type === 'string') {
			// Load the texture URL
			if (urlOrObject) {
				this.url(urlOrObject);
			}
		}

		if (type === 'object') {
			// Assign the texture script object
			this.assignSmartTextureImage(urlOrObject);
		}
	},

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			// Check if this ID already exists in the object register
			if (ige._register[id]) {
				// Already an object with this ID!
				this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
			} else {
				// Check if we already have an id assigned
				if (this._id && ige._register[this._id]) {
					// Unregister the old ID before setting this new one
					ige.unRegister(this);
				}

				this._id = id;

				// Now register this object with the object register
				ige.register(this);

				return this;
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			if (this._url) {
				// Generate an ID from the URL string of the image
				// this texture is using. Useful for always reproducing
				// the same ID for the same texture :)
				this._id = ige.newIdFromString(this._url);
			} else {
				// We don't have a URL so generate a random ID
				this._id = ige.newIdHex();
			}
			ige.register(this);
		}

		return this._id;
	},

	/**
	 * Gets / sets the source file for this texture.
	 * @param {String=} url "The url used to load the file for this texture.
	 * @return {*}
	 */
	url: function (url) {
		if (url !== undefined) {
			this._url = url;

			if (url.substr(url.length - 2, 2) === 'js') {
				// This is a script-based texture, load the script
				this._loadScript(url);
			} else {
				// This is an image-based texture, load the image
				this._loadImage(url);
			}

			return this;
		}

		return this._url;
	},

	/**
	 * Loads an image into an img tag and sets an onload event
	 * to capture when the image has finished loading.
	 * @param {String} imageUrl The image url used to load the
	 * image data.
	 * @private
	 */
	_loadImage: function (imageUrl) {
		var image,
			self = this;

		if (!ige.isServer) {
			// Increment the texture load count
			ige.textureLoadStart(imageUrl, this);

			if (!ige._textureImageStore[imageUrl]) {
				// Create the image object
				image = ige._textureImageStore[imageUrl] = this.image = this._originalImage = new Image();
				image._igeTextures = image._igeTextures || [];

				// Add this texture to the textures that are using this image
				image._igeTextures.push(this);

				image.onload = function () {
					// Mark the image as loaded
					image._loaded = true;

					// Log success
					ige.log('Texture image (' + imageUrl + ') loaded successfully');

					if (image.width % 2) {
						self.log('The texture ' + imageUrl + ' width (' + image.width + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture width is divisible by 2!', 'warning');
					}

					if (image.height % 2) {
						self.log('The texture ' + imageUrl + ' height (' + image.height + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture height is divisible by 2!', 'warning');
					}

					// Loop textures that are using this image
					var arr = image._igeTextures,
						arrCount = arr.length, i,
						item;

					for (i = 0; i < arrCount; i++) {
						item = arr[i];

						item._mode = 0;

						item.sizeX(image.width);
						item.sizeY(image.height);

						item._cells[1] = [0, 0, item._sizeX, item._sizeY];

						item._loaded = true;
						item.emit('loaded');

						// Inform the engine that this image has loaded
						ige.textureLoadEnd(imageUrl, self);
					}
				};

				// Start the image loading by setting the source url
				image.src = imageUrl;
			} else {
				// Grab the cached image object
				image = this.image = this._originalImage = ige._textureImageStore[imageUrl];

				// Add this texture to the textures that are using this image
				image._igeTextures.push(this);

				if (image._loaded) {
					// The cached image object is already loaded so
					// fire off the relevant events
					self._mode = 0;

					self.sizeX(image.width);
					self.sizeY(image.height);

					if (image.width % 2) {
						this.log('This texture\'s width is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
					}

					if (image.height % 2) {
						this.log('This texture\'s height is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
					}

					self._cells[1] = [0, 0, self._sizeX, self._sizeY];

					self._loaded = true;

					// Set a timeout here so that when this event is emitted,
					// the code creating the texture is given a chance to
					// set a listener first, otherwise this will be emitted
					// but nothing will have time to register a listener!
					setTimeout(function () {
						self.emit('loaded');

						// Inform the engine that this image has loaded
						ige.textureLoadEnd(imageUrl, self);
					}, 1);
				}
			}
		}
	},

	/**
	 * Loads a render script into a script tag and sets an onload
	 * event to capture when the script has finished loading.
	 * @param {String} scriptUrl The script url used to load the
	 * script data.
	 * @private
	 */
	_loadScript: function (scriptUrl) {
		var textures = ige.textures,
			rs_sandboxContext,
			self = this,
			scriptElem;

		ige.textureLoadStart(scriptUrl, this);

		if (!ige.isServer) {
			scriptElem = document.createElement('script');
			scriptElem.onload = function(data) {
				self.log('Texture script "' + scriptUrl + '" loaded successfully');
				// Parse the JS with evil eval and store the result in the asset
				eval(data);

				// Store the eval data (the "image" variable is declared
				// by the texture script and becomes available in this scope
				// because we evaluated it above)
				self._mode = 1;
				self.script = image;

				// Run the asset script init method
				if (typeof(image.init) === 'function') {
					image.init.apply(image, [self]);
				}

				//self.sizeX(image.width);
				//self.sizeY(image.height);

				self._loaded = true;
				self.emit('loaded');
				ige.textureLoadEnd(scriptUrl, self);
			};

			scriptElem.addEventListener('error', function () {
				self.log('Error loading smart texture script file: ' + scriptUrl, 'error');
			}, true);

			scriptElem.src = scriptUrl;
			document.getElementsByTagName('head')[0].appendChild(scriptElem);
		}
	},

	/**
	 * Assigns a render script to the smart texture.
	 * @param {String} scriptObj The script object.
	 * @private
	 */
	assignSmartTextureImage: function (scriptObj) {
		var textures = ige.textures,
			rs_sandboxContext,
			self = this,
			scriptElem;

		//ige.textureLoadStart(scriptUrl, this);

		// Store the script data
		self._mode = 1;
		self.script = scriptObj;

		// Run the asset script init method
		if (typeof(scriptObj.init) === 'function') {
			scriptObj.init.apply(scriptObj, [self]);
		}

		//self.sizeX(image.width);
		//self.sizeY(image.height);

		self._loaded = true;
		self.emit('loaded');
		//ige.textureLoadEnd(scriptUrl, self);
	},

	/**
	 * Sets the image element that the IgeTexture will use when
	 * rendering. This is a special method not designed to be called
	 * directly by any game code and is used specifically when
	 * assigning an existing canvas element to an IgeTexture.
	 * @param {Image} imageElement The canvas / image to use as
	 * the image data for the IgeTexture.
	 * @private
	 */
	_setImage: function (imageElement) {
		var image,
			self = this;

		if (!ige.isServer) {
			// Create the image object
			image = this.image = this._originalImage = imageElement;
			image._igeTextures = image._igeTextures || [];

			// Mark the image as loaded
			image._loaded = true;

			this._mode = 0;

			this.sizeX(image.width);
			this.sizeY(image.height);

			this._cells[1] = [0, 0, this._sizeX, this._sizeY];
		}
	},

	/**
	 * Creates a new texture from a cell in the existing texture
	 * and returns the new texture.
	 * @param {Number, String} indexOrId The cell index or id to use.
	 * @return {*}
	 */
	textureFromCell: function (indexOrId) {
		var tex = new IgeTexture(),
			self = this;

		if (this._loaded) {
			this._textureFromCell(tex, indexOrId);
		} else {
			// The texture has not yet loaded, return the new texture and set a listener to handle
			// when this texture has loaded so we can assign the texture's image properly
			this.on('loaded', function () {
				self._textureFromCell(tex, indexOrId);
			})
		}

		return tex;
	},

	/**
	 * Called by textureFromCell() when the texture is ready
	 * to be processed. See textureFromCell() for description.
	 * @param {IgeTexture} tex The new texture to paint to.
	 * @param {Number, String} indexOrId The cell index or id
	 * to use.
	 * @private
	 */
	_textureFromCell: function (tex, indexOrId) {
		var index,
			cell,
			canvas,
			ctx;

		if (typeof(indexOrId) === 'string') {
			index = this.cellIdToIndex(indexOrId);
		} else {
			index = indexOrId;
		}

		if (this._cells[index]) {
			// Create a new IgeTexture, then draw the existing cell
			// to it's internal canvas
			cell = this._cells[index];
			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d');

			// Set smoothing mode
			if (!this._smoothing) {
				ctx.imageSmoothingEnabled = false;
				ctx.webkitImageSmoothingEnabled = false;
				ctx.mozImageSmoothingEnabled = false;
			} else {
				ctx.imageSmoothingEnabled = true;
				ctx.webkitImageSmoothingEnabled = true;
				ctx.mozImageSmoothingEnabled = true;
			}

			canvas.width = cell[2];
			canvas.height = cell[3];

			// Draw the cell to the canvas
			ctx.drawImage(
				this._originalImage,
				cell[0],
				cell[1],
				cell[2],
				cell[3],
				0,
				0,
				cell[2],
				cell[3]
			);

			// Set the new texture's image to the canvas
			tex._setImage(canvas);
			tex._loaded = true;

			// Fire the loaded event
			setTimeout(function () {
				tex.emit('loaded');
			}, 1);
		} else {
			this.log('Unable to create new texture from passed cell index (' + indexOrId + ') because the cell does not exist!', 'warning');
		}
	},

	/**
	 * Sets the _sizeX property.
	 * @param {Number} val
	 */
	sizeX: function (val) {
		this._sizeX = val;
	},

	/**
	 * Sets the _sizeY property.
	 * @param {Number} val
	 */
	sizeY: function (val) {
		this._sizeY = val;
	},

	/**
	 * Resizes the original texture image to a new size. This alters
	 * the image that the texture renders so all entities that use
	 * this texture will output the newly resized version of the image.
	 * @param {Number} x The new width.
	 * @param {Number} y The new height.
	 * @param {Boolean=} dontDraw If true the resized image will not be
	 * drawn to the texture canvas. Useful for just resizing the texture
	 * canvas and not the output image. Use in conjunction with the
	 * applyFilter() and preFilter() methods.
	 */
	resize: function (x, y, dontDraw) {
		if (this._originalImage) {
			if (this._loaded) {
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');
				}

				this._textureCanvas.width = x;
				this._textureCanvas.height = y;
				this._textureCtx = this._textureCanvas.getContext('2d');

				// Set smoothing mode
				if (!this._smoothing) {
					this._textureCtx.imageSmoothingEnabled = false;
					this._textureCtx.webkitImageSmoothingEnabled = false;
					this._textureCtx.mozImageSmoothingEnabled = false;
				} else {
					this._textureCtx.imageSmoothingEnabled = true;
					this._textureCtx.webkitImageSmoothingEnabled = true;
					this._textureCtx.mozImageSmoothingEnabled = true;
				}

				if (!dontDraw) {
					// Draw the original image to the new canvas
					// scaled as required
					this._textureCtx.drawImage(
						this._originalImage,
						0,
						0,
						this._originalImage.width,
						this._originalImage.height,
						0,
						0,
						x,
						y
					);
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;
			} else {
				this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
			}
		}
	},

	/**
	 * Resizes the original texture image to a new size based on percentage.
	 * This alters the image that the texture renders so all entities that use
	 * this texture will output the newly resized version of the image.
	 * @param {Number} x The new width.
	 * @param {Number} y The new height.
	 * @param {Boolean=} dontDraw If true the resized image will not be
	 * drawn to the texture canvas. Useful for just resizing the texture
	 * canvas and not the output image. Use in conjunction with the
	 * applyFilter() and preFilter() methods.
	 */
	resizeByPercent: function (x, y, dontDraw) {
		if (this._originalImage) {
			if (this._loaded) {
				// Calc final x/y values
				x = Math.floor((this.image.width / 100) * x);
				y = Math.floor((this.image.height / 100) * y);

				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');
				}

				this._textureCanvas.width = x;
				this._textureCanvas.height = y;
				this._textureCtx = this._textureCanvas.getContext('2d');

				// Set smoothing mode
				if (!this._smoothing) {
					this._textureCtx.imageSmoothingEnabled = false;
					this._textureCtx.webkitImageSmoothingEnabled = false;
					this._textureCtx.mozImageSmoothingEnabled = false;
				} else {
					this._textureCtx.imageSmoothingEnabled = true;
					this._textureCtx.webkitImageSmoothingEnabled = true;
					this._textureCtx.mozImageSmoothingEnabled = true;
				}

				if (!dontDraw) {
					// Draw the original image to the new canvas
					// scaled as required
					this._textureCtx.drawImage(
						this._originalImage,
						0,
						0,
						this._originalImage.width,
						this._originalImage.height,
						0,
						0,
						x,
						y
					);
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;
			} else {
				this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
			}
		}
	},

	/**
	 * Sets the texture image back to the original image that the
	 * texture first loaded. Useful if you have applied filters
	 * or resized the image and now want to revert back to the
	 * original.
	 */
	restoreOriginal: function () {
		this.image = this._originalImage;
		delete this._textureCtx;
		delete this._textureCanvas;
	},

	smoothing: function (val) {
		if (val !== undefined) {
			this._smoothing = val;
			return this;
		}

		return this._smoothing;
	},

	/**
	 * Renders the texture image to the passed canvas context.
	 * @param {CanvasRenderingContext2d} ctx The canvas context to draw to.
	 * @param {IgeEntity} entity The entity that this texture is
	 * being drawn for.
	 */
	render: function (ctx, entity) {
		// Check that the cell is not set to null. If it is then
		// we don't render anything which effectively makes the
		// entity "blank"
		if (entity._cell !== null) {
			if (!this._smoothing) {
				ige._ctx.imageSmoothingEnabled = false;
				ige._ctx.webkitImageSmoothingEnabled = false;
				ige._ctx.mozImageSmoothingEnabled = false;
			} else {
				ige._ctx.imageSmoothingEnabled = true;
				ige._ctx.webkitImageSmoothingEnabled = true;
				ige._ctx.mozImageSmoothingEnabled = true;
			}

			if (this._mode === 0) {
				// This texture is image-based
				var cell = this._cells[entity._cell],
					geom = entity._geometry,
					poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method

				if (cell) {
					if (this._preFilter && this._textureCtx) {
						// Call the preFilter method
						this._textureCtx.save();
						this._preFilter(this._textureCanvas, this._textureCtx, this._originalImage, this, this._preFilterData);
						this._textureCtx.restore();
					}

					ctx.drawImage(
						this.image,
						cell[0], // texture x
						cell[1], // texture y
						cell[2], // texture width
						cell[3], // texture height
						poly.x, // render x
						poly.y, // render y
						geom.x, // render width
						geom.y // render height
					);

					ige._drawCount++;
				} else {
					this.log('Cannot render texture using cell ' + entity._cell + ' because the cell does not exist in the assigned texture!', 'error');
				}
			}

			if (this._mode === 1) {
				// This texture is script-based (a "smart texture")
				ctx.save();
					this.script.render(ctx, entity, this);
				ctx.restore();

				ige._drawCount++;
			}
		}
	},

	/**
	 * Gets / sets the pre-filter method that will be called before
	 * the texture is rendered and will allow you to modify the texture
	 * image before rendering each tick.
	 * @param method
	 * @return {*}
	 */
	preFilter: function (method, data) {
		if (method !== undefined) {
			if (this._originalImage) {
				if (!this._textureCtx) {
					// Create a new canvas
					this._textureCanvas = document.createElement('canvas');

					this._textureCanvas.width = this._originalImage.width;
					this._textureCanvas.height = this._originalImage.height;
					this._textureCtx = this._textureCanvas.getContext('2d');

					// Set smoothing mode
					if (!this._smoothing) {
						this._textureCtx.imageSmoothingEnabled = false;
						this._textureCtx.webkitImageSmoothingEnabled = false;
						this._textureCtx.mozImageSmoothingEnabled = false;
					} else {
						this._textureCtx.imageSmoothingEnabled = true;
						this._textureCtx.webkitImageSmoothingEnabled = true;
						this._textureCtx.mozImageSmoothingEnabled = true;
					}
				}

				// Swap the current image for this new canvas
				this.image = this._textureCanvas;

				// Store the pre-filter method
				this._preFilter = method;
				this._preFilterData = data;
			}
			return this;
		} else {
			this.log('Cannot use pre-filter, no filter method was passed!', 'warning');
		}

		return this._preFilter;
	},

	/**
	 * Applies a filter to the texture. The filter is a method that will
	 * take the canvas, context and originalImage parameters and then
	 * use context calls to alter / paint the context with the texture
	 * and any filter / adjustments that you want to apply.
	 * @param {Function} method
	 * @param {Object=} data
	 * @return {*}
	 */
	applyFilter: function (method, data) {
		if (this._loaded) {
			if (method !== undefined) {
				if (this._originalImage) {
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
	
						this._textureCanvas.width = this._originalImage.width;
						this._textureCanvas.height = this._originalImage.height;
						this._textureCtx = this._textureCanvas.getContext('2d');
	
						// Set smoothing mode
						if (!this._smoothing) {
							this._textureCtx.imageSmoothingEnabled = false;
							this._textureCtx.webkitImageSmoothingEnabled = false;
							this._textureCtx.mozImageSmoothingEnabled = false;
						} else {
							this._textureCtx.imageSmoothingEnabled = true;
							this._textureCtx.webkitImageSmoothingEnabled = true;
							this._textureCtx.mozImageSmoothingEnabled = true;
						}
					}
	
					// Swap the current image for this new canvas
					this.image = this._textureCanvas;
	
					// Call the passed method
					this._textureCtx.save();
					method(this._textureCanvas, this._textureCtx, this._originalImage, this, data);
					this._textureCtx.restore();
				}
			} else {
				this.log('Cannot apply filter, no filter method was passed!', 'warning');
			}
		} else {
			this.log('Cannot apply filter, the texture you are trying to apply the filter to has not yet loaded!', 'error');
		}

		return this;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this._url + "')";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "')";

		// Now get all other properties
		str += this._stringify();

		return str;
	},

	/**
	 * Destroys the item.
	 */
	destroy: function () {
		delete this._eventListeners;

		// Remove us from the image store reference array
		if (this.image && this.image._igeTextures) {
			this.image._igeTextures.pull(this);
		}

		// Remove the texture from the texture store
		ige._textureStore.pull(this);

		delete this.image;
		delete this.script;
		delete this._textureCanvas;
		delete this._textureCtx;

		this._destroyed = true;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; };/**
 * Creates a new cell sheet. Cell sheets are textures that are
 * automatically split up into individual cells based on a cell
 * width and height.
 */
var IgeCellSheet = IgeTexture.extend({
	classId: 'IgeCellSheet',
	IgeSpriteSheet: true,

	init: function (url, horizontalCells, verticalCells) {
		var self = this;

		self.horizontalCells(horizontalCells || 1);
		self.verticalCells(verticalCells || 1);

		this.on('loaded', function () {
			if (self.image) {
				// Store the cell sheet image
				self._sheetImage = this.image;
				self._applyCells();
			} else {
				// Unable to create cells from non-image texture
				// TODO: Low-priority - Support cell sheets from smart-textures
				self.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
			}
		});

		CLASSNAME.prototype._editNAME_.call(this, url);
	},

	/**
	 * Returns the total number of cells in the cell sheet.
	 * @return {Number}
	 */
	cellCount: function () {
		return this.horizontalCells() * this.verticalCells();
	},

	/**
	 * Gets / sets the number of horizontal cells in the cell sheet.
	 * @param {Number=} val The integer count of the number of horizontal cells in the cell sheet.
	 */
	horizontalCells: function (val) {
		if (val !== undefined) {
			this._cellColumns = val;
			return this;
		}

		return this._cellColumns;
	},

	/**
	 * Gets / sets the number of vertical cells in the cell sheet.
	 * @param {Number=} val The integer count of the number of vertical cells in the cell sheet.
	 */
	verticalCells: function (val) {
		if (val !== undefined) {
			this._cellRows = val;
			return this;
		}

		return this._cellRows;
	},

	/**
	 * Sets the x, y, width and height of each sheet cell and stores
	 * that information in the this._cells array.
	 * @private
	 */
	_applyCells: function () {
		var imgWidth, imgHeight,
			rows, columns,
			cellWidth, cellHeight,
			cellIndex,
			xPos, yPos;

		// Do we have an image to use?
		if (this.image) {
			// Check we have the correct data for a uniform cell layout
			if (this._cellRows && this._cellColumns) {
				imgWidth = this._sizeX;
				imgHeight = this._sizeY;
				rows = this._cellRows;
				columns = this._cellColumns;

				// Store the width and height of a single cell
				cellWidth = this._cellWidth = imgWidth / columns;
				cellHeight = this._cellHeight = imgHeight / rows;

				// Check if the cell width and height are non-floating-point
				if (cellWidth !== parseInt(cellWidth, 10)) {
					this.log('Cell width is a floating-point number! (Image Width ' + imgWidth + ' / Number of Columns ' + columns + ' = ' + cellWidth + ') in file: ' + this._url, 'warning');
				}

				if (cellHeight !== parseInt(cellHeight, 10)) {
					this.log('Cell height is a floating-point number! (Image Height ' + imgHeight + ' / Number of Rows ' + rows + ' = ' + cellHeight + ')  in file: ' + this._url, 'warning');
				}

				// Check if we need to calculate individual cell data
				if (rows > 1 || columns > 1) {
					for (cellIndex = 1; cellIndex <= (rows * columns); cellIndex++) {
						yPos = (Math.ceil(cellIndex / columns) - 1);
						xPos = ((cellIndex - (columns * yPos)) - 1);

						// Store the xy in the sheet frames variable
						this._cells[cellIndex] = [(xPos * cellWidth), (yPos * cellHeight), cellWidth, cellHeight];
					}
				} else {
					// The cell data shows only one cell so just store the whole image data
					this._cells[1] = [0, 0, this._sizeX, this._sizeY];
				}
			}
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this.url() + "', " + this.horizontalCells() + ", " + this.verticalCells() + ")";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "');";

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; };/**
 * Creates a new sprite sheet that cuts an image up into
 * arbitrary sections.
 */
var IgeSpriteSheet = IgeTexture.extend({
	classId: 'IgeSpriteSheet',
	IgeSpriteSheet: true,

	init: function (url, cells) {
		var self = this;
		this.on('loaded', function () {
			if (self.image) {
				// Store the cell sheet image
				self._sheetImage = this.image;
				var i;

				if (!cells) {
					// Try to automatically determine cells
					this.log('No cell data provided for sprite sheet, attempting to automatically detect sprite bounds...');
					cells = this.detectCells(this._sheetImage);
				}

				// Cells in the sheets always start at index
				// 1 so move all the cells one forward
				for (i = 0; i < cells.length; i++) {
					self._cells[i + 1] = cells[i];

					if (this._checkModulus) {
						// Check cell for division by 2 modulus warnings
						if (cells[i][2] % 2) {
							this.log('This texture\'s cell definition defines a cell width is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
						}

						if (cells[i][3] % 2) {
							this.log('This texture\'s cell definition defines a cell height is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
						}
					}
				}
			} else {
				// Unable to create cells from non-image texture
				// TODO: Low-priority - Support cell sheets from smart-textures
				self.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
			}
		});

		CLASSNAME.prototype._editNAME_.call(this, url);
	},

	/**
	 * Uses the sprite sheet image pixel data to detect distinct sprite
	 * bounds.
	 * @param img
	 * @return {Array} An array of cell bounds.
	 */
	detectCells: function (img) {
		// Create a temp canvas
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d'),
			pixels,
			x, y,
			newRect,
			spriteRects = [];

		canvas.width = img.width;
		canvas.height = img.height;

		// Draw the sheet to the canvas
		ctx.drawImage(img, 0, 0);

		// Read the pixel data
		pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Loop the pixels and find non-transparent one
		for (y = 0; y < canvas.height; y++) {
			for (x = 0; x < canvas.width; x++) {
				// Check if the pixel is not transparent
				if (!pixels.isTransparent(x, y)) {
					// We found a non-transparent pixel so
					// is it in a rect we have already defined?
					if (!this._pixelInRects(spriteRects, x, y)) {
						// The pixel is not already in a rect,
						// so determine the bounding rect for
						// the new sprite whose pixel we've found
						newRect = this._determineRect(pixels, x, y);

						if (newRect) {
							spriteRects.push(newRect);
						} else {
							this.log('Cannot automatically determine sprite bounds!', 'warning');
							return [];
						}
					}
				}
			}
		}

		return spriteRects;
	},

	_pixelInRects: function (rects, x, y) {
		var rectIndex,
			rectCount = rects.length,
			rect;

		for (rectIndex = 0; rectIndex < rectCount; rectIndex++) {
			rect = rects[rectIndex];

			// Check if the x, y is inside this rect
			if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
				// The x, y is inside this rect
				return true;
			}
		}

		return false;
	},

	_determineRect: function (pixels, x, y) {
		var pixArr = [{x: x, y: y}],
			rect = {x: x, y: y, width: 1, height: 1},
			currentPixel;

		while (pixArr.length) {
			// De-queue front item
			currentPixel = pixArr.shift();

			// Expand rect to include pixel position
			if (currentPixel.x > rect.x + rect.width) {
				rect.width = currentPixel.x - rect.x + 1;
			}

			if (currentPixel.y > rect.y + rect.height) {
				rect.height = currentPixel.y - rect.y + 1;
			}

			if (currentPixel.x < rect.x) {
				rect.width += rect.x - currentPixel.x;
				rect.x = currentPixel.x;
			}

			if (currentPixel.y < rect.y) {
				rect.height += rect.y - currentPixel.y;
				rect.y = currentPixel.y;
			}

			// Check surrounding pixels
			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y})
			}

			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y + 1})
			}

			if (!pixels.isTransparent(currentPixel.x, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x, y: currentPixel.y + 1})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y + 1})
			}
		}

		return [rect.x, rect.y, rect.width, rect.height];
	},

	/**
	 * Returns the total number of cells in the cell sheet.
	 * @return {Number}
	 */
	cellCount: function () {
		return this._cells.length;
	},

	/**
	 * Returns the cell index that the passed cell id corresponds
	 * to.
	 * @param {String} id
	 * @return {Number} The cell index that the cell id corresponds
	 * to or -1 if a corresponding index could not be found.
	 */
	cellIdToIndex: function (id) {
		var cells = this._cells,
			i;
		for (i = 1; i < cells.length; i++) {
			if (cells[i][4] === id) {
				// Found the cell id so return the index
				return i;
			}
		}

		return -1;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this.url() + "', " + this._cells.toString() + ")";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "');";

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSpriteSheet; };/**
 * Creates a new object.
 */
var IgeObject = IgeEventingClass.extend({
	classId: 'IgeObject',

	init: function () {
		this._newBorn = true;
		this._alive = true;
		this._mode = 0;
		this._mountMode = 0;
		this._parent = null;
		this._children = [];
		this._layer = 0;
		this._depth = 0;
		this._dirty = true;
		this._depthSortMode = 0;
		this._timeStream = [];
		this._inView = true;
	},

	/**
	 * Determines if the object is alive or not. The alive
	 * value is automatically set to false when the object's
	 * destroy() method is called. Useful for checking if
	 * an object that you are holding a reference to has been
	 * destroyed.
	 * @param {Boolean=} val The value to set the alive flag
	 * to.
	 * @example #Get the alive flag value
	 *     var entity = new IgeEntity();
	 *     console.log(entity.alive());
	 * @example #Set the alive flag value
	 *     var entity = new IgeEntity();
	 *     entity.alive(true);
	 * @return {*}
	 */
	alive: function (val) {
		if (val !== undefined) {
			this._alive = val;
			return this;
		}

		return this._alive;
	},

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @example #Get the id of an entity
	 *     var entity = new IgeEntity();
	 *     console.log(entity.id());
	 * @example #Set the id of an entity
	 *     var entity = new IgeEntity();
	 *     entity.id('myNewId');
	 * @example #Set the id of an entity via chaining
	 *     var entity = new IgeEntity()
	 *         .id('myNewId');
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			// Check if we're changing the id
			if (id !== this._id) {
				// Check if this ID already exists in the object register
				if (ige._register[id]) {
					// Already an object with this ID!
					if (ige._register[id] !== this) {
						this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
					}
				} else {
					// Check if we already have an id assigned
					if (this._id && ige._register[this._id]) {
						// Unregister the old ID before setting this new one
						ige.unRegister(this);
					}

					this._id = id;

					// Now register this object with the object register
					ige.register(this);

					return this;
				}
			} else {
				// The same ID we already have is being applied,
				// ignore the request and return
				return this;
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = ige.newIdHex();
			ige.register(this);
		}

		return this._id;
	},

	/**
	 * Gets / sets the arbitrary category name that the object belongs to.
	 * @param {String=} val
	 * @example #Get the category of an entity
	 *     var entity = new IgeEntity();
	 *     console.log(entity.category());
	 * @example #Set the category of an entity
	 *     var entity = new IgeEntity();
	 *     entity.category('myNewCategory');
	 * @example #Set the category of an entity via chaining
	 *     var entity = new IgeEntity()
	 *         .category('myNewCategory');
	 * @example #Get all the entities belonging to a category
	 *     var entityArray = ige.$$('categoryName');
	 * @example #Remove the category of an entity
	 *     // Set category to some name
	 *     var entity = new IgeEntity()
	 *         .category('myCategory');
	 *         
	 *     // Will output "myCategory"
	 *     console.log(entity.category());
	 *     
	 *     // Now remove the category
	 *     entity.category('');
	 *     
	 *     // Will return ""
	 *     console.log(entity.category());
	 * @return {*}
	 */
	category: function (val) {
		if (val !== undefined) {
			// Check if we already have a category
			if (this._category) {
				// Check if the category being assigned is different from
				// the current one
				if (this._category !== val) {
					// The category is different so remove this object
					// from the current category association
					ige.categoryUnRegister(this);
				}
			}
			
			this._category = val;

			// Check the category is not a blank string
			if (val) {
				// Now register this object with the category it has been assigned
				ige.categoryRegister(this);
			}
			return this;
		}

		return this._category;
	},

	/**
	 * DEPRECIATED - Use category() instead. A warning method to
	 * help developers move to the new groups system.
	 */
	group: function () {
		this.log('The group() method has been renamed to category(). Please update your code.', 'error');
	},

	/**
	 * Adds this entity to a group or groups passed as
	 * arguments.
	 * @param {*} groupName A group or array of group names
	 * to add the entity to.
	 * @example #Add entity to a single group
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1');
	 * @example #Add entity to multiple groups
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2', 'g3');
	 * @example #Add entity to multiple groups via an array
	 *     var entity = new IgeEntity();
	 *     entity.addGroup(['g1', 'g2', 'g3']);
	 * @example #Add entity to multiple groups via multiple arrays
	 *     var entity = new IgeEntity();
	 *     entity.addGroup(['g1', 'g2', 'g3'], ['g4', 'g5']);
	 * @return {*}
	 */
	addGroup: function () {
		var arrCount = arguments.length,
			groupName,
			groupItemCount;

		while (arrCount--) {
			groupName = arguments[arrCount];
			
			// Check if the argument is an array
			if (groupName instanceof Array) {
				groupItemCount = groupName.length;
				
				// Add each group of the array to the entity
				while (groupItemCount--) {
					if (!this._groups || this._groups.indexOf(groupName[groupItemCount]) === -1) {
						this._groups = this._groups || [];
						this._groups.push(groupName[groupItemCount]);

						// Now register this object with the group it has been assigned
						ige.groupRegister(this, groupName[groupItemCount]);
					}
				}
			} else {
				if (!this._groups || this._groups.indexOf(groupName) === -1) {
					this._groups = this._groups || [];
					this._groups.push(groupName);
	
					// Now register this object with the group it has been assigned
					ige.groupRegister(this, groupName);
				}
			}
		}

		return this;
	},

	/**
	 * Checks if the entity is in the group or array of group
	 * names passed.
	 * @param {*} groupName A group name or array of names.
	 * @param {Boolean=} matchAllGroups If set to true, will cause
	 * the method to check if the entity is in ALL the groups,
	 * otherwise the method will check if the entity is in ANY group.
	 * @example #Check if the entity is in a group
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *	
	 *     // Will output true since entity is part of g1 group
	 *     console.log(entity.inGroup('g1', false);
	 *	
	 *     // Will output false since entity is not part of g3 group
	 *     console.log(entity.inGroup('g3', false);
	 * @example #Check if the entity is in an array of groups using ANY and ALL options
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *     
	 *     // Will output true since entity is part of g1 group
	 *     console.log(entity.inGroup(['g1, 'g3'], false);
	 *     
	 *     // Will output false since entity is not part of g3 group
	 *     console.log(entity.inGroup(['g1, 'g3'], true);
	 * @return {Boolean}
	 */
	inGroup: function (groupName, matchAllGroups) {
		if (groupName) {
			if (matchAllGroups) {
				return this.inAllGroups(groupName);
			} else {
				return this.inAnyGroup(groupName);
			}
		}
		
		return false;
	},

	/**
	 * Checks if the entity is in the specified group or
	 * array of groups. If multiple group names are passed,
	 * as an array the method will only return true if the
	 * entity is in ALL the passed groups.
	 * @param {*} groupName The name of the group or array
	 * if group names to check if this entity is a member of.
	 * @example #Check if entity belongs to all of the passed groups
	 *     // Add a couple of groups
	 *     var entity = new IgeEntity();
	 *     entity.addGroup(['g1', 'g2']);
	 *	
	 *     // This will output "false" (entity is not part of g3)
	 *     console.log(entity.inAllGroups(['g1', 'g3']));
	 *	
	 *     // This will output "true"
	 *     console.log(entity.inAllGroups('g1'));
	 *	
	 *     // This will output "true"
	 *     console.log(entity.inAllGroups(['g1', 'g2']));
	 * @return {Boolean}
	 */
	inAllGroups: function (groupName) {
		var arrItem, arrCount;
		
		if (groupName instanceof Array) {
			arrCount = groupName.length;
			
			while (arrCount--) {
				arrItem = groupName[arrCount];
			
				if (arrItem) {
					if (!this._groups || this._groups.indexOf(arrItem) === -1) {
						return false;
					}
				}
			}
		} else {
			return !(!this._groups || this._groups.indexOf(groupName) === -1);
		}

		return true;
	},

	/**
	 * Checks if the entity is in the specified group or
	 * array of group names. If multiple group names are passed
	 * as an array, the method will return true if the entity
	 * is in ANY of the the passed groups.
	 * @param {*} groupName The name of the group or array of
	 * group names to check if this entity is a member of.
	 * @example #Check if entity belongs to any of the passed groups
	 *     // Add a couple of groups
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *	
	 *     // This will output "false"
	 *     console.log(entity.inAnyGroup('g3'));
	 *	
	 *     // This will output "true"
	 *     console.log(entity.inAnyGroup(['g3', 'g1']));
	 * @return {Boolean}
	 */
	inAnyGroup: function (groupName) {
		var arrItem, arrCount;

		if (groupName instanceof Array) {
			arrCount = groupName.length;

			while (arrCount--) {
				arrItem = groupName[arrCount];

				if (arrItem) {
					if (this._groups && this._groups.indexOf(arrItem) > -1) {
						return true;
					}
				}
			}
		} else {
			return (this._groups && this._groups.indexOf(groupName) > -1);
		}

		return false;
	},

	/**
	 * Gets an array of all groups this entity belongs to.
	 * @example #Get array of groups entity belongs to
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *	
	 *     // This will output "['g1', 'g2']"
	 *     console.log(entity.groups());
	 * @return {*}
	 */
	groups: function () {
		return this._groups || [];
	},

	/**
	 * Gets the number of groups this entity belongs to.
	 * @example #Get number of groups entity belongs to
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *	
	 *     // This will output "2"
	 *     console.log(entity.groupCount());
	 * @return {Number}
	 */
	groupCount: function () {
		return this._groups ? this._groups.length : 0;
	},

	/**
	 * Removes the entity from the group or groups passed. This
	 * method accepts multiple arguments and will remove the entity
	 * from all groups passed as arguments.
	 * @param {*} groupName The name of the group or array of group
	 * names to remove this entity as a member of.
	 * @example #Remove entity from single group
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2');
	 *	
	 *     // This will output "['g1', 'g2']"
	 *     console.log(entity.groups());
	 *	
	 *     // Remove entity from a single group
	 *     entity.removeGroup('g1');
	 *	
	 *     // This will output "['g2']"
	 *     console.log(entity.groups());
	 * @example #Remove entity from multiple groups
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g3', 'g2');
	 *	
	 *     // This will output "['g1', 'g3', 'g2']"
	 *     console.log(entity.groups());
	 *	
	 *     // Remove entity from multiple groups
	 *     entity.removeGroup('g1', 'g3');
	 *	
	 *     // This will output "['g2']"
	 *     console.log(entity.groups());
	 * @example #Remove entity from multiple groups via an array
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g3', 'g2');
	 *	
	 *     // This will output "['g1', 'g3', 'g2']"
	 *     console.log(entity.groups());
	 *	
	 *     // Remove entity from multiple groups
	 *     entity.removeGroup(['g1', 'g3']);
	 *	
	 *     // This will output "['g2']"
	 *     console.log(entity.groups());
	 * @example #Remove entity from multiple groups via multiple arrays
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7');
	 *	
	 *     // This will output "['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7']"
	 *     console.log(entity.groups());
	 *	
	 *     // Remove entity from multiple groups
	 *     entity.removeGroup(['g1', 'g3'], ['g5', 'g6', 'g7']);
	 *	
	 *     // This will output "['g2', 'g4']"
	 *     console.log(entity.groups());
	 * @return {*}
	 */
	removeGroup: function () {
		if (this._groups) {
			var arrCount = arguments.length,
				groupName,
				groupNameCount;

			while (arrCount--) {
				groupName = arguments[arrCount];
				
				if (groupName instanceof Array) {
					groupNameCount = groupName.length;
					
					while (groupNameCount--) {
						this._groups.pull(groupName[groupNameCount]);

						// Now un-register this object with the group it has been assigned
						ige.groupUnRegister(this, groupName[groupNameCount]);
					}
				} else {
					this._groups.pull(groupName);
	
					// Now un-register this object with the group it has been assigned
					ige.groupUnRegister(this, groupName);
				}
			}
		}

		return this;
	},

	/**
	 * Removes the entity from all groups it is a member of.
	 * @example #Remove entity from all groups
	 *     var entity = new IgeEntity();
	 *     entity.addGroup('g1', 'g3', 'g2');
	 *	
	 *     // This will output "['g1', 'g3', 'g2']"
	 *     console.log(entity.groups());
	 *	
	 *     // Remove all the groups
	 *     entity.removeAllGroups();
	 *	
	 *     // This will output "[]"
	 *     console.log(entity.groups());
	 * @return {*}
	 */
	removeAllGroups: function () {
		if (this._groups) {
			// Loop through all groups and un-register one at a time
			var arr = this._groups,
				arrCount = arr.length;

			while (arrCount--) {
				ige.groupUnRegister(this, arr[arrCount]);
			}

			delete this._groups;
		}
		return this;
	},

	/**
	 * Adds a behaviour to the object's active behaviour list.
	 * @param {String} id
	 * @param {Function} behaviour
	 * @param {Boolean=} duringTick If true, will execute the behaviour
	 * during the tick() method instead of the update() method.
	 * @example #Add a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *     
	 *     // Now since each update we are setting _somePropertyOfTheEntity
	 *     // to equal "moo" we can console log the property and get
	 *     // the value as "moo"
	 *     console.log(entity._somePropertyOfTheEntity);
	 * @return {*} Returns this on success or false on failure.
	 */
	addBehaviour: function (id, behaviour, duringTick) {
		if (typeof(id) === 'string') {
			if (typeof(behaviour) === 'function') {
				if (duringTick) {
					this._tickBehaviours = this._tickBehaviours || [];
					this._tickBehaviours.push({
						id:id,
						method: behaviour
					});
				} else {
					this._updateBehaviours = this._updateBehaviours || [];
					this._updateBehaviours.push({
						id:id,
						method: behaviour
					});	
				}

				return this;
			} else {
				this.log('The behaviour you passed is not a function! The second parameter of the call must be a function!', 'error');
			}
		} else {
			this.log('Cannot add behaviour to object because the specified behaviour id is not a string. You must provide two parameters with the addBehaviour() call, an id:String and a behaviour:Function. Adding a behaviour with an id allows you to remove it by it\'s id at a later stage!', 'error');
		}

		return false;
	},

	/**
	 * Removes a behaviour to the object's active behaviour list by it's id.
	 * @param {String} id
	 * @param {Boolean=} duringTick If true will look to remove the behaviour
	 * from the tick method rather than the update method.
	 * @example #Remove a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *     
	 *     // Now remove the "myBehaviour" behaviour
	 *     entity.removeBehaviour('myBehaviour');
	 * @return {*} Returns this on success or false on failure.
	 */
	removeBehaviour: function (id, duringTick) {
		if (id !== undefined) {
			var arr,
				arrCount;
			
			if (duringTick) {
				arr = this._tickBehaviours;
			} else {
				arr = this._updateBehaviours;
			}

			// Find the behaviour
			if (arr) {
				arrCount = arr.length;

				while (arrCount--) {
					if (arr[arrCount].id === id) {
						// Remove the item from the array
						arr.splice(arrCount, 1);
						return this;
					}
				}
			}
		}

		return false;
	},

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's bounds drawn when the bounds for all objects are being drawn.
	 * In order for bounds to be drawn the viewport the object is being drawn
	 * to must also have draw bounds enabled.
	 * @param {Boolean} val
	 * @example #Enable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(true);
	 * @example #Disable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBounds());
	 * @return {*}
	 */
	drawBounds: function (val) {
		if (val !== undefined) {
			this._drawBounds = val;
			return this;
		}

		return this._drawBounds;
	},

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's bounds data drawn when the bounds for all objects are being drawn.
	 * Bounds data includes the object ID and it's current depth etc.
	 * @param {Boolean} val
	 * @example #Enable draw bounds data
	 *     var entity = new IgeEntity();
	 *     entity.drawBoundsData(true);
	 * @example #Disable draw bounds data
	 *     var entity = new IgeEntity();
	 *     entity.drawBoundsData(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBoundsData());
	 * @return {*}
	 */
	drawBoundsData: function (val) {
		if (val !== undefined) {
			this._drawBoundsData = val;
			return this;
		}

		return this._drawBoundsData;
	},

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's mouse position data drawn when the bounds for all objects are
	 * being drawn.
	 * @param {Boolean=} val
	 * @example #Enable draw mouse position data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouse(true);
	 * @example #Disable draw mouse position data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouse(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawMouse());
	 * @return {*}
	 */
	drawMouse: function (val) {
		if (val !== undefined) {
			this._drawMouse = val;
			return this;
		}

		return this._drawMouse;
	},

	/**
	 * Returns the object's parent object (the object that
	 * it is mounted to).
	 * @example #Get the object parent
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *     
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *     
	 *     // Get the parent of entity2 (which is entity1)
	 *     var parent = entity2.parent();
	 *     
	 *     // Log the parent's id (will output "entity1")
	 *     console.log(parent.id());
	 * @return {*}
	 */
	parent: function () {
		return this._parent;
	},

	/**
	 * Returns the object's children as an array of objects.
	 * @example #Get the child objects array
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *	
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *	
	 *     // Get the chilren array entity1
	 *     var childArray = entity1.children();
	 *	
	 *     // Log the child array contents (will contain entity2)
	 *     console.log(childArray);
	 * @return {Array} The array of child objects.
	 */
	children: function () {
		return this._children;
	},

	/**
	 * Mounts this object to the passed object in the scenegraph.
	 * @param {IgeObject} obj
	 * @example #Mount an entity to another entity
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *	
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 * @return {*} Returns this on success or false on failure.
	 */
	mount: function (obj) {
		if (obj) {
			if (obj._children) {
				// Check that the engine will allow us to register this object
				this.id(); // Generates a new id if none is currently set, and registers it on the object register!

				if (this._parent) {
					if (this._parent === obj) {
						// We are already mounted to the parent!
						return this;
					} else {
						// We are already mounted to a different parent
						this.unMount();
					}
				}

				this._parent = obj;
				if (!this._ignoreCamera && this._parent._ignoreCamera) {
					this._ignoreCamera = this._parent._ignoreCamera;
				}
				obj._children.push(this);

				this._parent._childMounted(this);

				obj.updateTransform();
				obj.aabb(true);

				this.emit('mounted', this._parent);

				return this;
			} else {
				// The object has no _children array!
				return false;
			}
		} else {
			this.log('Cannot mount non-existent object!', 'error');
		}
	},

	/**
	 * Unmounts this object from it's parent object in the scenegraph.
	 * @example #Unmount an entity from another entity
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *	
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *     
	 *     // Now unmount entity2 from entity1
	 *     entity2.unMount();
	 * @return {*} Returns this on success or false on failure.
	 */
	unMount: function () {
		if (this._parent) {
			var childArr = this._parent._children,
				index = childArr.indexOf(this);

			if (index > -1) {
				// Found this in the parent._children array so remove it
				childArr.splice(index, 1);

				this._parent._childUnMounted(this);
				this._parent = null;

				return this;
			} else {
				// Cannot find this in the parent._children array
				return false;
			}
		} else {
			return false;
		}
	},

	/**
	 * NOT IMPLEMENTED - Clones the object and all it's children and returns a new object.
	 */
		// TODO: Write this function!
	clone: function () {
		// Loop all children and clone them, then return cloned version of ourselves
	},

	/**
	 * Gets / sets the positioning mode of the entity.
	 * @param {Number=} val 0 = 2d, 1 = isometric
	 * @example #Set the positioning mode to 2d
	 *     var entity = new IgeEntity()
	 *         .mode(0);
	 * @example #Set the positioning mode to isometric
	 *     var entity = new IgeEntity()
	 *         .mode(1);
	 * @return {*}
	 */
	mode: function (val) {
		if (val !== undefined) {
			this._mode = val;
			return this;
		}

		return this._mode;
	},

	/**
	 * Gets / sets if this object should be positioned isometrically
	 * or in 2d.
	 * @param {Boolean} val Set to true to position this object in
	 * isometric space or false to position it in 2d space.
	 * @example #Set the positioning mode to isometric
	 *     var entity = new IgeEntity()
	 *         .isometric(true);
	 * @example #Set the positioning mode to 2d
	 *     var entity = new IgeEntity()
	 *         .isometric(false);
	 * @return {*}
	 */
	isometric: function (val) {
		if (val === true) {
			this._mode = 1;
			return this;
		}

		if (val === false) {
			this._mode = 0;
			return this;
		}

		return this._mode === 1;
	},

	/**
	 * Gets / sets if objects mounted to this object should be positioned
	 * and depth-sorted in an isometric fashion or a 2d fashion.
	 * @param {Boolean=} val Set to true to enabled isometric positioning
	 * and depth sorting of objects mounted to this object, or false to
	 * enable 2d positioning and depth-sorting of objects mounted to this
	 * object.
	 * @example #Set children to be positioned and depth sorted in 2d
	 *     var entity = new IgeEntity()
	 *         .isometricMounts(false);
	 * @example #Set children to be positioned and depth sorted in isometric
	 *     var entity = new IgeEntity()
	 *         .isometricMounts(true);
	 * @return {*}
	 */
	isometricMounts: function (val) {
		if (val === true) {
			this._mountMode = 1;
			return this;
		}

		if (val === false) {
			this._mountMode = 0;
			return this;
		}

		return this._mountMode === 1;
	},

	/**
	 * Gets / sets the indestructible flag. If set to true, the object will
	 * not be destroyed even if a call to the destroy() method is made.
	 * @param {Number=} val
	 * @example #Set an entity to indestructible
	 *     var entity = new IgeEntity()
	 *         .indestructible(true);
	 * @example #Set an entity to destructible
	 *     var entity = new IgeEntity()
	 *         .indestructible(false);
	 * @example #Get an entity's indestructible flag value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.indestructible());
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	indestructible: function (val) {
		if (typeof(val) !== 'undefined') {
			this._indestructible = val;
			return this;
		}

		return this._indestructible;
	},

	/**
	 * Gets / sets the current entity layer. This affects how the entity is depth-sorted
	 * against other entities of the same parent. Please note that entities are first sorted
	 * by their layer and then by their depth, and only entities of the same layer will be
	 * sorted against each other by their depth values.
	 * @param {Number=} val
	 * @example #Set an entity's layer to 22
	 *     var entity = new IgeEntity()
	 *         .layer(22);
	 * @example #Get an entity's layer value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.layer());
	 * @example #How layers and depths are handled together
	 *     var entity1 = new IgeEntity(),
	 *         entity2 = new IgeEntity(),
	 *         entity3 = new IgeEntity();
	 *         
	 *     // Set entity1 to at layer zero and depth 100
	 *     entity1.layer(0)
	 *         .depth(100);
	 *     
	 *     // Set entity2 and 3 to be at layer 1
	 *     entity2.layer(1);
	 *     entity3.layer(1);
	 *	
	 *     // Set entity3 to have a higher depth than entity2
	 *     entity2.depth(0);
	 *     entity3.depth(1);
	 *     
	 *     // The engine sorts first based on layer from lowest to highest
	 *     // and then within each layer, by depth from lowest to highest.
	 *     // This means that entity1 will be drawn before entity 2 and 3
	 *     // because even though it's depth is higher, it is not on the same
	 *     // layer as entity 2 and 3.
	 *     
	 *     // Based on the layers and depths we have assigned, here
	 *     // is how the engine will sort the draw order of the entities
	 *     // entity1
	 *     // entity2
	 *     // entity3
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	layer: function (val) {
		if (val !== undefined) {
			this._layer = val;
			return this;
		}

		return this._layer;
	},

	/**
	 * Gets / sets the current render depth of the object (higher depths
	 * are drawn over lower depths). Please note that entities are first sorted
	 * by their layer and then by their depth, and only entities of the same layer will be
	 * sorted against each other by their depth values.
	 * @param {Number=} val
	 * @example #Set an entity's depth to 1
	 *     var entity = new IgeEntity()
	 *         .depth(1);
	 * @example #Get an entity's depth value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.depth());
	 * @example #How layers and depths are handled together
	 *     var entity1 = new IgeEntity(),
	 *         entity2 = new IgeEntity(),
	 *         entity3 = new IgeEntity();
	 *
	 *     // Set entity1 to at layer zero and depth 100
	 *     entity1.layer(0)
	 *         .depth(100);
	 *
	 *     // Set entity2 and 3 to be at layer 1
	 *     entity2.layer(1);
	 *     entity3.layer(1);
	 *
	 *     // Set entity3 to have a higher depth than entity2
	 *     entity2.depth(0);
	 *     entity3.depth(1);
	 *
	 *     // The engine sorts first based on layer from lowest to highest
	 *     // and then within each layer, by depth from lowest to highest.
	 *     // This means that entity1 will be drawn before entity 2 and 3
	 *     // because even though it's depth is higher, it is not on the same
	 *     // layer as entity 2 and 3.
	 *
	 *     // Based on the layers and depths we have assigned, here
	 *     // is how the engine will sort the draw order of the entities
	 *     // entity1
	 *     // entity2
	 *     // entity3
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	depth: function (val) {
		if (val !== undefined) {
			this._depth = val;
			return this;
		}

		return this._depth;
	},

	/**
	 * Loops through all child objects of this object and destroys them
	 * by calling each child's destroy() method then deletes the reference
	 * to the object's internal _children array.
	 */
	destroyChildren: function () {
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].destroy();
			}
		}

		delete this._children;

		return this;
	},

	/**
	 * Removes all references to any behaviour methods that were added to
	 * this object.
	 */
	destroyBehaviours: function () {
		delete this._updateBehaviours;
		delete this._tickBehaviours;
	},

	/**
	 * Loops through all components added to this object and calls their
	 * destroy() method, then removes any references to the components.
	 * @return {*}
	 */
	destroyComponents: function () {
		var arr = this._components,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				if (arr[arrCount].destroy) {
					arr[arrCount].destroy();
				}
			}
		}

		delete this._components;

		return this;
	},

	/**
	 * Gets / sets the dirty flag for this object. If you specify a val parameter
	 * the parent of this object will also have it's dirty method called with the
	 * same parameter. This means that dirty flags bubble down the child / parent
	 * chain.
	 * @param {Boolean} val
	 */
	dirty: function (val) {
		if (val !== undefined) {
			this._dirty = val;

			// Bubble the dirty up the parent chain
			if (this._parent) {
				this._parent.dirty(val);
			}

			return this;
		}

		return this._dirty;
	},

	/**
	 * Gets / sets the depth sort mode that is used when
	 * depth sorting this object's children against each other. This
	 * mode only applies if this object's mount mode is isometric,
	 * as set by calling isometricMounts(true). If the mount mode is
	 * 2d, the depth sorter will use a very fast 2d depth sort that
	 * does not use 3d bounds at all.
	 * @param {Number=} val The mode to use when depth sorting
	 * this object's children, given as an integer value.
	 * @example #Turn off all depth sorting for this object's children
	 *     entity.depthSortMode(-1);
	 * @example #Use 3d bounds when sorting this object's children
	 *     entity.depthSortMode(0);
	 * @example #Use 3d bounds optimised for mostly cube-shaped bounds when sorting this object's children
	 *     entity.depthSortMode(1);
	 * @example #Use 3d bounds optimised for all cube-shaped bounds when sorting this object's children
	 *     entity.depthSortMode(2);
	 * @return {*}
	 */
	depthSortMode: function (val) {
		if (val !== undefined) {
			this._depthSortMode = val;
			return this;
		}

		return this._depthSortMode;
	},

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren: function () {
		if (this._depthSortMode !== -1) {
			// TODO: Optimise this method, it is not especially efficient at the moment!
			var arr = this._children,
				arrCount,
				sortObj,
				i, j;

			if (arr) {
				arrCount = arr.length;

				// See if we can bug-out early
				if (arrCount > 1) {
					// Check if the mount mode is isometric
					if (this._mountMode === 1) {
						// Check the depth sort mode
						if (this._depthSortMode === 0) { // Slowest, uses 3d bounds
							// Calculate depths from 3d bounds
							sortObj = {
								adj: [],
								c: [],
								p: [],
								order: [],
								order_ind: arrCount - 1
							};

							for (i = 0; i < arrCount; ++i) {
								sortObj.c[i] = 0;
								sortObj.p[i] = -1;

								for (j = i + 1; j < arrCount; ++j) {
									sortObj.adj[i] = sortObj.adj[i] || [];
									sortObj.adj[j] = sortObj.adj[j] || [];

									if (arr[i]._inView && arr[j]._inView && arr[i]._projectionOverlap && arr[j]._projectionOverlap) {
										if (arr[i]._projectionOverlap(arr[j])) {
											if (arr[i].isBehind(arr[j])) {
												sortObj.adj[j].push(i);
											} else {
												sortObj.adj[i].push(j);
											}
										}
									}
								}
							}

							for (i = 0; i < arrCount; ++i) {
								if (sortObj.c[i] === 0) {
									this._depthSortVisit(i, sortObj);
								}
							}

							for (i = 0; i < sortObj.order.length; i++) {
								arr[sortObj.order[i]].depth(i);
							}

							this._children.sort(function (a, b) {
								var layerIndex = b._layer - a._layer;

								if (layerIndex === 0) {
									// On same layer so sort by depth
									return b._depth - a._depth;
								} else {
									// Not on same layer so sort by layer
									return layerIndex;
								}
							});
						}

						if (this._depthSortMode === 1) { // Medium speed, optimised for almost-cube shaped 3d bounds
							// Now sort the entities by depth
							this._children.sort(function (a, b) {
								var layerIndex = b._layer - a._layer;

								if (layerIndex === 0) {
									// On same layer so sort by depth
									//if (a._projectionOverlap(b)) {
										if (a.isBehind(b)) {
											return -1;
										} else {
											return 1;
										}
									//}
								} else {
									// Not on same layer so sort by layer
									return layerIndex;
								}
							});
						}

						if (this._depthSortMode === 2) { // Fastest, optimised for cube-shaped 3d bounds
							while (arrCount--) {
								sortObj = arr[arrCount];
								j = sortObj._translate;

								if (j) {
									sortObj._depth = j.x + j.y + j.z;
								}
							}

							// Now sort the entities by depth
							this._children.sort(function (a, b) {
								var layerIndex = b._layer - a._layer;

								if (layerIndex === 0) {
									// On same layer so sort by depth
									return b._depth - a._depth;
								} else {
									// Not on same layer so sort by layer
									return layerIndex;
								}
							});
						}
					} else { // 2d mode
						// Now sort the entities by depth
						this._children.sort(function (a, b) {
							var layerIndex = b._layer - a._layer;

							if (layerIndex === 0) {
								// On same layer so sort by depth
								return b._depth - a._depth;
							} else {
								// Not on same layer so sort by layer
								return layerIndex;
							}
						});
					}
				}
			}
		}
	},

	/**
	 * Gets / sets the view checking flag that if set to true
	 * will ask the engine to check during each tick if this
	 * object is actually "on screen" or not, and bypass it
	 * if it is not. The default is this flag set to false.
	 * @param {Boolean=} val The boolean flag value.
	 * @return {*}
	 */
	viewChecking: function (val) {
		if (val !== undefined) {
			this._viewChecking = val;
			return this;
		}

		return this._viewChecking;
	},

	/**
	 * ALPHA CODE DO NOT USE YET.
	 * When view checking is enabled, this method is called to
	 * determine if this object is within the bounds of an active
	 * viewport, essentially determining if the object is
	 * "on screen" or not.
	 */
	viewCheckChildren: function () {
		if (ige._currentViewport) {
			var arr = this._children,
				arrCount = arr.length,
				vpViewArea = ige._currentViewport.viewArea(),
				item;
	
			while (arrCount--) {
				item = arr[arrCount];
	
				if (item._alwaysInView) {
					item._inView = true;
				} else {
					if (item.aabb) {
						// Check the entity to see if its bounds are "inside" the
						// viewport's visible area
						if (vpViewArea.rectIntersect(item.aabb(true))) {
							// The entity is inside the viewport visible area
							item._inView = true;
						} else {
							item._inView = false;
						}
					} else {
						item._inView = false;
					}
				}
			}
		}
		
		return this;
	},
	
	update: function (ctx) {
		// Check that we are alive before processing further
		if (this._alive) {
			if (this._newBorn) { this._newBorn = false; }
			var arr = this._children,
				arrCount,
				ts, td;

			if (arr) {
				arrCount = arr.length;
				
				// Depth sort all child objects
				if (arrCount && !ige._headless) {
					if (igeConfig.debug._timing) {
						if (!ige._timeSpentLastTick[this.id()]) {
							ige._timeSpentLastTick[this.id()] = {};
						}

						ts = new Date().getTime();
						this.depthSortChildren();
						td = new Date().getTime() - ts;
						ige._timeSpentLastTick[this.id()].depthSortChildren = td;
					} else {
						this.depthSortChildren();
					}
				}

				// Loop our children and call their update methods
				if (igeConfig.debug._timing) {
					while (arrCount--) {
						ts = new Date().getTime();
						arr[arrCount].update(ctx);
						td = new Date().getTime() - ts;
						if (arr[arrCount]) {
							if (!ige._timeSpentInTick[arr[arrCount].id()]) {
								ige._timeSpentInTick[arr[arrCount].id()] = 0;
							}

							if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
								ige._timeSpentLastTick[arr[arrCount].id()] = {};
							}

							ige._timeSpentInTick[arr[arrCount].id()] += td;
							ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
						}
					}
				} else {
					while (arrCount--) {
						arr[arrCount].update(ctx);
					}
				}
			}
		}
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx) {
		// Check that we are alive before processing further
		if (this._alive) {
			var arr = this._children,
				arrCount,
				ts, td;
	
			if (this._viewChecking) {
				// Set the in-scene flag for each child based on
				// the current viewport
				this.viewCheckChildren();
			}
	
			// Loop the child objects of this object
			if (arr) {
				arrCount = arr.length;
				
				// Loop our children and call their tick methods
				if (igeConfig.debug._timing) {
					while (arrCount--) {
						if (!arr[arrCount]._newBorn) {
							ctx.save();
							ts = new Date().getTime();
							arr[arrCount].tick(ctx);
							td = new Date().getTime() - ts;
							if (arr[arrCount]) {
								if (!ige._timeSpentInTick[arr[arrCount].id()]) {
									ige._timeSpentInTick[arr[arrCount].id()] = 0;
								}
		
								if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
									ige._timeSpentLastTick[arr[arrCount].id()] = {};
								}
		
								ige._timeSpentInTick[arr[arrCount].id()] += td;
								ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
							}
							ctx.restore();
						}
					}
				} else {
					while (arrCount--) {
						if (!arr[arrCount]._newBorn) {
							ctx.save();
							arr[arrCount].tick(ctx);
							ctx.restore();
						}
					}
				}
			}
		}
	},

	_depthSortVisit: function (u, sortObj) {
		var arr = sortObj.adj[u],
			arrCount = arr.length,
			i, v;

		sortObj.c[u] = 1;

		for (i = 0; i < arrCount; ++i) {
			v = arr[i];

			if (sortObj.c[v] === 0) {
				sortObj.p[v] = u;
				this._depthSortVisit(v, sortObj);
			}
		}

		sortObj.c[u] = 2;
		sortObj.order[sortObj.order_ind] = u;
		--sortObj.order_ind;
	},

	/**
	 * Handles screen resize events. Calls the _resizeEvent method of
	 * every child object mounted to this object.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		}


	},

	/**
	 * Calls each behaviour method for the object.
	 * @private
	 */
	_processUpdateBehaviours: function (ctx) {
		var arr = this._updateBehaviours,
			arrCount;

		if (arr) {
			arrCount = arr.length;
			while (arrCount--) {
				arr[arrCount].method.apply(this, arguments);
			}
		}
	},

	/**
	 * Calls each behaviour method for the object.
	 * @private
	 */
	_processTickBehaviours: function (ctx) {
		var arr = this._tickBehaviours,
			arrCount;

		if (arr) {
			arrCount = arr.length;
			while (arrCount--) {
				arr[arrCount].method.apply(this, arguments);
			}
		}
	},
	
	/**
	 * Called when a child object is mounted to this object.
	 * @param obj
	 * @private
	 */
	_childMounted: function (obj) {
		this._resizeEvent(null);
	},

	/**
	 * Called when a child object is un-mounted to this object.
	 * @param obj
	 * @private
	 */
	_childUnMounted: function (obj) {},

	/**
	 * Destroys the object and all it's child objects, removing them from the
	 * scenegraph and from memory.
	 */
	destroy: function () {
		// Remove ourselves from any parent
		this.unMount();

		// Remove any children
		if (this._children) {
			this.destroyChildren();
		}

		// Remove any components
		this.destroyComponents();

		// Remove any behaviours
		this.destroyBehaviours();

		// Remove the object from the lookup system
		ige.unRegister(this);
		ige.categoryUnRegister(this);
		ige.groupUnRegister(this);

		// Set a flag in case a reference to this object
		// has been held somewhere, shows that the object
		// should no longer be interacted with
		this._alive = false;

		// Remove the event listeners array in case any
		// object references still exist there
		delete this._eventListeners;

		return this;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "()";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "')";

		// Now check if there is a parent and mount that
		if (this.parent()) {
			str += ".mount(ige.$('" + this.parent().id() + "'))";
		}

		// Now get all other properties
		str += this._stringify();

		return str;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		var str = '', i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_category':
						str += ".category(" + this.category() + ")";
						break;
					case '_drawBounds':
						str += ".drawBounds(" + this.drawBounds() + ")";
						break;
					case '_drawBoundsData':
						str += ".drawBoundsData(" + this.drawBoundsData() + ")";
						break;
					case '_drawMouse':
						str += ".drawMouse(" + this.drawMouse() + ")";
						break;
					case '_mode':
						str += ".mode(" + this.mode() + ")";
						break;
					case '_isometricMounts':
						str += ".isometricMounts(" + this.isometricMounts() + ")";
						break;
					case '_indestructible':
						str += ".indestructible(" + this.indestructible() + ")";
						break;
					case '_layer':
						str += ".layer(" + this.layer() + ")";
						break;
					case '_depth':
						str += ".depth(" + this.depth() + ")";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeObject; };/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
 */
var IgeEntity = IgeObject.extend({
	classId: 'IgeEntity',

	init: function () {
		CLASSNAME.prototype._editNAME_.call(this);

		this._width = undefined;
		this._height = undefined;

		this._anchor = new IgePoint(0, 0, 0);
		this._renderPos = {x: 0, y: 0};

		this._opacity = 1;
		this._cell = 1;

		this._deathTime = undefined;

		this._oldTranslate = new IgePoint(0, 0, 0);
		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

		this._geometry = new IgePoint(40, 40, 40);

		this._highlight = false;
		this._mouseEventsActive = false;

        this._localMatrix = new IgeMatrix2d(this);
        this._worldMatrix = new IgeMatrix2d(this);

		this._inView = true;
		this._hidden = false;

		

		// Set the default stream sections as just the transform data
		this.streamSections(['transform']);
	},

	/**
	 * Sets the entity as visible and able to be interacted with.
	 * @example #Show a hidden entity
	 *     entity.show();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	show: function () {
		this._hidden = false;
		return this;
	},

	/**
	 * Sets the entity as hidden and cannot be interacted with.
	 * @example #Hide a visible entity
	 *     entity.hide();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	hide: function () {
		this._hidden = true;
		return this;
	},

	/**
	 * Gets / sets the cache flag that determines if the entity's
	 * texture rendering output should be stored on an off-screen
	 * canvas instead of calling the texture.render() method each
	 * tick. Useful for expensive texture calls such as rendering
	 * fonts etc.
	 * @param {Boolean=} val True to enable caching, false to
	 * disable caching.
	 * @example #Enable entity caching
	 *     entity.cache(true);
	 * @example #Disable entity caching
	 *     entity.cache(false);
	 * @example #Get caching flag value
	 *     var val = entity.cache();
	 * @return {*}
	 */
	cache: function (val) {
		if (val !== undefined) {
			this._cache = val;

			if (val) {
				// Create the off-screen canvas
				this._cacheCanvas = document.createElement('canvas');
				this._cacheCtx = this._cacheCanvas.getContext('2d');
				this._cacheDirty = true;
			} else {
				// Remove the off-screen canvas
				delete this._cacheCanvas;
			}

			return this;
		}

		return this._cache;
	},

	/**
	 * Gets / sets the cache dirty flag. If set to true this will
	 * instruct the entity to re-draw it's cached image from the
	 * assigned texture. Once that occurs the flag will automatically
	 * be set back to false.
	 * @param {Boolean=} val True to force a cache update.
	 * @example #Get cache dirty flag value
	 *     var val = entity.cacheDirty();
	 * @example #Set cache dirty flag value
	 *     entity.cacheDirty(true);
	 * @return {*}
	 */
	cacheDirty: function (val) {
		if (val !== undefined) {
			this._cacheDirty = val;
			return this;
		}

		return this._cacheDirty;
	},

	/**
	 * Gets the position of the mouse relative to this entity.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @return {IgePoint} The mouse point relative to the entity
	 * @example #Get the mouse position relative to the entity
	 *     // The returned value is an object with properties x, y, z
	 *     var mousePos = entity.mousePos();
	 * center.
	 */
	mousePos: function (viewport) {
		viewport = viewport || ige._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();

			if (this._ignoreCamera) {
				mp.thisAddPoint(ige._currentCamera._translate);
			}
			
			mp.x += viewport._translate.x;
			mp.y += viewport._translate.y;
			this._transformPoint(mp);
			return mp;
		} else {
			return new IgePoint(0, 0, 0);
		}
	},

	/**
	 * Gets the position of the mouse relative to this entity not
	 * taking into account viewport translation.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @example #Get absolute mouse position
	 *     var mousePosAbs = entity.mousePosAbsolute();
	 * @return {IgePoint} The mouse point relative to the entity
	 * center.
	 */
	mousePosAbsolute: function (viewport) {
		viewport = viewport || ige._currentViewport;
		if (viewport) {
			var mp = viewport._mousePos.clone();
			this._transformPoint(mp);
			return mp;
		}

		return new IgePoint(0, 0, 0);
	},

	/**
	 * Gets the position of the mouse in world co-ordinates.
	 * @param {IgeViewport=} viewport The viewport to use as the
	 * base from which the mouse position is determined. If no
	 * viewport is specified then the current viewport the engine
	 * is rendering to is used instead.
	 * @example #Get mouse position in world co-ordinates
	 *     var mousePosWorld = entity.mousePosWorld();
	 * @return {IgePoint} The mouse point relative to the world
	 * center.
	 */
	mousePosWorld: function (viewport) {
		viewport = viewport || ige._currentViewport;
		var mp = this.mousePos(viewport);
		this.localToWorldPoint(mp, viewport);

		if (this._ignoreCamera) {
			viewport.camera._worldMatrix.transform([mp]);
		}

		return mp;
	},

	/**
	 * Rotates the entity to point at the target point around the z axis.
	 * @param {IgePoint} point The point in world co-ordinates to
	 * point the entity at.
	 * @example #Point the entity at another entity
	 *     entity.rotateToPoint(otherEntity.worldPosition());
	 * @example #Point the entity at mouse
	 *     entity.rotateToPoint(ige._currentViewport.mousePos());
	 * @example #Point the entity at an arbitrary point x, y
	 *     entity.rotateToPoint(new IgePoint(x, y, 0));
	 * @return {*}
	 */
	rotateToPoint: function (point) {
		this.rotateTo(
			this._rotate.x,
			this._rotate.y,
			(Math.atan2(this._translate.y - point.y, this._translate.x - point.x) - this._parent._rotate.z) + Math.radians(270)
		);

		return this;
	},

	/**
	 * Translates the object to the tile co-ordinates passed.
	 * @param {Number} x The x tile co-ordinate.
	 * @param {Number} y The y tile co-ordinate.
	 * @param {Number=} z The z tile co-ordinate.
	 * @example #Translate entity to tile
	 *     // Create a tile map
	 *     var tileMap = new IgeTileMap2d()
	 *         .tileWidth(40)
	 *         .tileHeight(40);
	 *     
	 *     // Mount our entity to the tile map
	 *     entity.mount(tileMap);
	 *     
	 *     // Translate the entity to the tile x:10, y:12
	 *     entity.translateToTile(10, 12, 0);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	translateToTile: function (x, y, z) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var finalZ;

			// Handle being passed a z co-ordinate
			if (z !== undefined) {
				finalZ = z * this._parent._tileWidth;
			} else {
				finalZ = this._translate.z;
			}

			this.translateTo(x * this._parent._tileWidth, y * this._parent._tileHeight, finalZ);
		} else {
			this.log('Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Gets / sets the texture to use as the background
	 * pattern for this entity.
	 * @param {IgeTexture} texture The texture to use as
	 * the background.
	 * @param {String=} repeat The type of repeat mode either: "repeat",
	 * "repeat-x", "repeat-y" or "none".
	 * @param {Boolean=} trackCamera If set to true, will track the camera
	 * translation and "move" the background with the camera.
	 * @param {Boolean=} isoTile If true the tiles of the background will
	 * be treated as isometric and will therefore be drawn so that they are
	 * layered seamlessly in isometric view.
	 * @example #Set a background pattern for this entity with 2d tiling
	 *     var texture = new IgeTexture('path/to/my/texture.png');
	 *     entity.backgroundPattern(texture, 'repeat', true, false);
	 * @example #Set a background pattern for this entity with isometric tiling
	 *     var texture = new IgeTexture('path/to/my/texture.png');
	 *     entity.backgroundPattern(texture, 'repeat', true, true);
	 * @return {*}
	 */
	backgroundPattern: function (texture, repeat, trackCamera, isoTile) {
		if (texture !== undefined) {
			this._backgroundPattern = texture;
			this._backgroundPatternRepeat = repeat || 'repeat';
			this._backgroundPatternTrackCamera = trackCamera;
			this._backgroundPatternIsoTile = isoTile;
			return this;
		}

		return this._backgroundPattern;
	},

	/**
	 * Set the object's width to the number of tile width's specified.
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new width.
	 * @example #Set the width of the entity based on the tile width of the map the entity is mounted to
	 *     // Set the entity width to the size of 1 tile with
	 *     // lock aspect enabled which will automatically size
	 *     // the height as well so as to maintain the aspect
	 *     // ratio of the entity
	 *     entity.widthByTile(1, true);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	widthByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2,
				ratio;

			this.width(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the height based on the new width
					ratio = this._texture._sizeX / this._geometry.x;
					this.height(this._texture._sizeY / ratio);
				} else {
					this.log('Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!', 'error');
				}
			}
		} else {
			this.log('Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Set the object's height to the number of tile height's specified.
	 * @param {Number} val Number of tiles.
	 * @param {Boolean=} lockAspect If true, sets the width according
	 * to the texture aspect ratio and the new height.
	 * @example #Set the height of the entity based on the tile height of the map the entity is mounted to
	 *     // Set the entity height to the size of 1 tile with
	 *     // lock aspect enabled which will automatically size
	 *     // the width as well so as to maintain the aspect
	 *     // ratio of the entity
	 *     entity.heightByTile(1, true);
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	heightByTile: function (val, lockAspect) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2,
				ratio;

			this.height(val * tileSize);

			if (lockAspect) {
				if (this._texture) {
					// Calculate the width based on the new height
					ratio = this._texture._sizeY / this._geometry.y;
					this.width(this._texture._sizeX / ratio);
				} else {
					this.log('Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!', 'error');
				}
			}
		} else {
			this.log('Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
		}

		return this;
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile map.
	 */
	occupyTile: function () {
		this.log('Cannot occupy a tile because the entity is not currently mounted to a tile map.', 'warning');
	},

	/**
	 * Dummy method to help debug when programmer expects to be
	 * able to access tile-based methods but cannot. This method
	 * is overwritten when the entity is mounted to a tile map.
	 */
	overTiles: function () {
		this.log('Cannot determine which tiles this entity lies over because the entity is not currently mounted to a tile map.', 'warning');
	},

	/**
	 * Gets / sets the anchor position that this entity's texture
	 * will be adjusted by.
	 * @param {Number=} x The x anchor value.
	 * @param {Number=} y The y anchor value.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	anchor: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._anchor = new IgePoint(x, y, 0);
			return this;
		}

		return this._anchor;
	},

	/**
	 * Gets / sets the geometry x value.
	 * @param {Number=} px The new x value in pixels.
	 * @example #Set the width of the entity
	 *     entity.width(40);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	width: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the height from the change in width
				var ratio = px / this._geometry.x;
				this.height(this._geometry.y * ratio);
			}

			this._width = px;
			this._geometry.x = px;
			this._geometry.x2 = (px / 2);
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry y value.
	 * @param {Number=} px The new y value in pixels.
	 * @example #Set the height of the entity
	 *     entity.height(40);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	height: function (px, lockAspect) {
		if (px !== undefined) {
			if (lockAspect) {
				// Calculate the width from the change in height
				var ratio = px / this._geometry.y;
				this.width(this._geometry.x * ratio);
			}

			this._height = px;
			this._geometry.y = px;
			this._geometry.y2 = (px / 2);
			return this;
		}

		return this._height;
	},

	/**
	 * Gets / sets the 3d geometry of the entity. The x and y values are
	 * relative to the center of the entity and the z value is wholly
	 * positive from the "floor". Primarily used when creating isometric
	 * container entities.
	 * @param {Number=} x The new x value in pixels.
	 * @param {Number=} y The new y value in pixels.
	 * @param {Number=} z The new z value in pixels.
	 * @example #Set the dimensions of the entity (width, height and length)
	 *     entity.size3d(40, 40, 20);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	size3d: function (x, y, z) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._geometry = new IgePoint(x, y, z);
			return this;
		}

		return this._geometry;
	},

	/**
	 * Gets / sets the life span of the object in milliseconds. The life
	 * span is how long the object will exist for before being automatically
	 * destroyed.
	 * @param {Number=} milliseconds The number of milliseconds the entity
	 * will live for from the current time.
	 * @example #Set the lifespan of the entity to 2 seconds after which it will automatically be destroyed
	 *     entity.lifeSpan(2000);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	lifeSpan: function (milliseconds) {
		if (milliseconds !== undefined) {
			this.deathTime(ige._currentTime + milliseconds);
			return this;
		}

		return this.deathTime() - ige._currentTime;
	},

	/**
	 * Gets / sets the timestamp in milliseconds that denotes the time
	 * that the entity will be destroyed. The object checks it's own death
	 * time during each tick and if the current time is greater than the
	 * death time, the object will be destroyed.
	 * @param {Number=} val The death time timestamp. This is a time relative
	 * to the engine's start time of zero rather than the current time that
	 * would be retrieved from new Date().getTime(). It is usually easier
	 * to call lifeSpan() rather than setting the deathTime directly.
	 * @example #Set the death time of the entity to 60 seconds after engine start
	 *     entity.deathTime(60000);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	deathTime: function (val) {
		if (val !== undefined) {
			this._deathTime = val;
			return this;
		}

		return this._deathTime;
	},

	/**
	 * Gets / sets the entity opacity from 0.0 to 1.0.
	 * @param {Number=} val The opacity value.
	 * @example #Set the entity to half-visible
	 *     entity.opacity(0.5);
	 * @example #Set the entity to fully-visible
	 *     entity.opacity(1.0);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	opacity: function (val) {
		if (val !== undefined) {
			this._opacity = val;
			return this;
		}

		return this._opacity;
	},

	/**
	 * Gets / sets the texture to use when rendering the entity.
	 * @param {IgeTexture=} texture The texture object.
	 * @example #Set the entity texture (image)
	 *     var texture = new IgeTexture('path/to/some/texture.png');
	 *     entity.texture(texture);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	texture: function (texture) {
		if (texture !== undefined) {
			this._texture = texture;
			return this;
		}

		return this._texture;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored.
	 * @param {Number=} val The cell index.
	 * @example #Set the entity texture as a 4x4 cell sheet and then set the cell to use
	 *     var texture = new IgeCellSheet('path/to/some/cellSheet.png', 4, 4);
	 *     entity.texture(texture)
	 *         .cell(3);
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cell: function (val) {
		if (val > 0 || val === null) {
			this._cell = val;
			return this;
		}

		return this._cell;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored. This differs from cell() in that it accepts a string id
	 * as the cell
	 * @param {Number=} val The cell id.
	 * @example #Set the entity texture as a sprite sheet with cell ids and then set the cell to use
	 *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
	 *         [0, 0, 40, 40, 'robotHead'],
	 *         [40, 0, 40, 40, 'humanHead'],
	 *     ]);
	 *     
	 *     // Assign the texture, set the cell to use and then
	 *     // set the entity to the size of the cell automatically!
	 *     entity.texture(texture)
	 *         .cellById('robotHead')
	 *         .dimensionsFromCell();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	cellById: function (val) {
		if (val !== undefined) {
			if (this._texture) {
				// Find the cell index this id corresponds to
				var i,
					tex = this._texture,
					cells = tex._cells;

				for (i = 1; i < cells.length; i++) {
					if (cells[i][4] === val) {
						// Found the cell id so assign this cell index
						this.cell(i);
						return this;
					}
				}

				// We were unable to find the cell index from the cell
				// id so produce an error
				this.log('Could not find the cell id "' + val + '" in the assigned entity texture ' + tex.id() + ', please check your sprite sheet (texture) cell definition to ensure the cell id "' + val + '" has been assigned to a cell!', 'error');
			} else {
				this.log('Cannot assign cell index from cell ID until an IgeSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().', 'error');
			}
		}

		return this._cell;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture.
	 * @param {Number=} percent The percentage size to resize to.
	 * @example #Set the entity dimensions based on the assigned texture
	 *     var texture = new IgeTexture('path/to/some/texture.png');
	 *	
	 *     // Assign the texture, and then set the entity to the
	 *     // size of the texture automatically!
	 *     entity.texture(texture)
	 *         .dimensionsFromTexture();
	 * @return {*} The object this method was called from to allow
	 * method chaining.
	 */
	dimensionsFromTexture: function (percent) {
		if (this._texture) {
			if (percent === undefined) {
				this.width(this._texture._sizeX);
				this.height(this._texture._sizeY);
			} else {
				this.width(Math.floor(this._texture._sizeX / 100 * percent));
				this.height(Math.floor(this._texture._sizeY / 100 * percent));
			}

			// Recalculate localAabb
			this.localAabb(true);
		}

		return this;
	},

	/**
	 * Sets the geometry of the entity to match the width and height
	 * of the assigned texture cell. If the texture is not cell-based
	 * the entire texture width / height will be used.
	 * @example #Set the entity dimensions based on the assigned texture and cell
	 *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
	 *         [0, 0, 40, 40, 'robotHead'],
	 *         [40, 0, 40, 40, 'humanHead'],
	 *     ]);
	 *
	 *     // Assign the texture, set the cell to use and then
	 *     // set the entity to the size of the cell automatically!
	 *     entity.texture(texture)
	 *         .cellById('robotHead')
	 *         .dimensionsFromCell();
	 * @return {*} The object this method was called from to allow
	 * method chaining
	 */
	dimensionsFromCell: function () {
		if (this._texture) {
			this.width(this._texture._cells[this._cell][2]);
			this.height(this._texture._cells[this._cell][3]);

			// Recalculate localAabb
			this.localAabb(true);
		}

		return this;
	},

	/**
	 * Gets / sets the highlight mode. True is on false is off.
	 * @param {Boolean} val The highlight mode true or false.
	 * @example #Set the entity to render highlighted
	 *     entity.highlight(true);
	 * @example #Get the current highlight state
	 *     var isHighlighted = entity.highlight();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	highlight: function (val) {
		if (val !== undefined) {
			this._highlight = val;
			return this;
		}

		return this._highlight;
	},

	/**
	 * Returns the absolute world position of the entity as an
	 * IgePoint.
	 * @example #Get the world position of the entity
	 *     var wordPos = entity.worldPosition();
	 * @return {IgePoint} The absolute world position of the
	 * entity.
	 */
	worldPosition: function () {
		return new IgePoint(this._worldMatrix.matrix[2], this._worldMatrix.matrix[5], 0);
	},

	/**
	 * Returns the absolute world rotation z of the entity as a
	 * value in radians.
	 * @example #Get the world rotation of the entity's z axis
	 *     var wordRot = entity.worldRotationZ();
	 * @return {Number} The absolute world rotation z of the
	 * entity.
	 */
	worldRotationZ: function () {
		return this._worldMatrix.rotationRadians();
	},

	/**
	 * Converts an array of points from local space to this entity's
	 * world space using it's world transform matrix. This will alter
	 * the points passed in the array directly.
	 * @param {Array} points The array of IgePoints to convert.
	 */
	localToWorld: function (points, viewport) {
		viewport = viewport || ige._currentViewport;
		this._worldMatrix.transform(points);

		if (this._ignoreCamera) {
			//viewport.camera._worldMatrix.transform(points);
		}
	},

	/**
	 * Converts a point from local space to this entity's world space
	 * using it's world transform matrix. This will alter the point's
	 * data directly.
	 * @param {IgePoint} point The IgePoint to convert.
	 */
	localToWorldPoint: function (point, viewport) {
		viewport = viewport || ige._currentViewport;
		this._worldMatrix.transform([point]);
	},

	/**
	 * Calculates and returns the current axis-aligned bounding box in
	 * world co-ordinates.
	 * @param {Boolean=} recalculate If true this will force the
	 * recalculation of the AABB instead of returning a cached
	 * value.
	 * @example #Get the entity axis-aligned bounding box dimensions
	 *     var aabb = entity.aabb();
	 *     
	 *     console.log(aabb.x);
	 *     console.log(aabb.y);
	 *     console.log(aabb.width);
	 *     console.log(aabb.height);
	 * @example #Get the entity axis-aligned bounding box dimensions forcing the engine to update the values first
	 *     var aabb = entity.aabb(true); // Call with true to force update
	 *     
	 *     console.log(aabb.x);
	 *     console.log(aabb.y);
	 *     console.log(aabb.width);
	 *     console.log(aabb.height);
	 * @return {IgeRect} The axis-aligned bounding box in world co-ordinates.
	 */
	aabb: function (recalculate) {
		if (!this._aabb || recalculate) { //  && this.newFrame()
			var poly = new IgePoly2d(),
				minX, minY,
				maxX, maxY,
				box,
				anc = this._anchor,
				geom = this._geometry,
				geomX = geom.x,
				geomY = geom.y,
				geomZ = geom.z,
				geomX2 = geom.x2,
				geomY2 = geom.y2,
				geomZ2 = geom.z2,
				origin = this._origin,
				originX = origin.x - 0.5,
				originY = origin.y - 0.5,
				originZ = origin.z - 0.5,
				x, y,
				ox,	oy,
				tf1;

			// Handle 2d entities
			if (this._mode === 0) {
				x = geomX2 + anc.x;
				y = geomY2 + anc.y;
				ox = geomX * originX;
				oy = geomY * originY;

				poly.addPoint(-x + ox, -y + oy);
				poly.addPoint(x + ox, -y + oy);
				poly.addPoint(x + ox, y + oy);
				poly.addPoint(-x + ox, y + oy);

				this._renderPos = {x: -x + ox, y: -y + oy};

				// Convert the poly's points from local space to world space
				this.localToWorld(poly._poly);

				// Get the extents of the newly transformed poly
				minX = Math.min(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				minY = Math.min(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				maxX = Math.max(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				maxY = Math.max(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				box = new IgeRect(minX, minY, maxX - minX, maxY - minY);
			}

			// Handle isometric entities
			if (this._mode === 1) {
				// Top face
				tf1 = new IgePoint(-(geom.x / 2), -(geom.y / 2),  (geom.z / 2)).toIso();

				x = (tf1.x + geom.x) + anc.x;
				y = tf1.y + anc.y;
				ox = geomX * originX;
				oy = geomZ * originZ;

				poly.addPoint(-x + ox, -y + oy);
				poly.addPoint(x + ox, -y + oy);
				poly.addPoint(x + ox, y + oy);
				poly.addPoint(-x + ox, y + oy);

				this._renderPos = {x: -x + ox, y: -y + oy};

				// Convert the poly's points from local space to world space
				this.localToWorld(poly._poly);

				// Get the extents of the newly transformed poly
				minX = Math.min(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				minY = Math.min(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				maxX = Math.max(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);

				maxY = Math.max(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);

				box = new IgeRect(Math.floor(minX), Math.floor(minY), Math.floor(maxX - minX), Math.floor(maxY - minY));
			}

			this._aabb = box;
		}

		return this._aabb;
	},

	/**
	 * Calculates and returns the local axis-aligned bounding box
	 * for the entity. This is the AABB relative to the entity's
	 * center point.
	 * @param {Boolean=} recalculate If true this will force the
	 * recalculation of the local AABB instead of returning a cached
	 * value.
	 * @example #Get the entity local axis-aligned bounding box dimensions
	 *     var aabb = entity.localAabb();
	 *	
	 *     console.log(aabb.x);
	 *     console.log(aabb.y);
	 *     console.log(aabb.width);
	 *     console.log(aabb.height);
	 * @example #Get the entity local axis-aligned bounding box dimensions forcing the engine to update the values first
	 *     var aabb = entity.localAabb(true); // Call with true to force update
	 *	
	 *     console.log(aabb.x);
	 *     console.log(aabb.y);
	 *     console.log(aabb.width);
	 *     console.log(aabb.height);
	 * @return {IgeRect} The local AABB.
	 */
	localAabb: function (recalculate) {
		if (!this._localAabb || recalculate) {
			var aabb = this.aabb();
			this._localAabb = new IgeRect(-Math.floor(aabb.width / 2), -Math.floor(aabb.height / 2), Math.floor(aabb.width), Math.floor(aabb.height));
		}

		return this._localAabb;
	},

	/**
	 * Takes two values and returns them as an array where index [0]
	 * is the y argument and index[1] is the x argument. This method
	 * is used specifically in the 3d bounds intersection process to
	 * determine entity depth sorting.
	 * @param {Number} x The first value.
	 * @param {Number} y The second value.
	 * @return {Array} The swapped arguments.
	 * @private
	 */
	_swapVars: function (x, y) {
		return [y, x];
	},

	_internalsOverlap: function (x0, x1, y0, y1) {
		var tempSwap;

		if (x0 > x1) {
			tempSwap = this._swapVars(x0, x1);
			x0 = tempSwap[0];
			x1 = tempSwap[1];
		}

		if (y0 > y1) {
			tempSwap = this._swapVars(y0, y1);
			y0 = tempSwap[0];
			y1 = tempSwap[1];
		}

		if (x0 > y0) {
			tempSwap = this._swapVars(x0, y0);
			x0 = tempSwap[0];
			y0 = tempSwap[1];

			tempSwap = this._swapVars(x1, y1);
			x1 = tempSwap[0];
			y1 = tempSwap[1];
		}

		return y0 < x1;
	},

	_projectionOverlap: function (otherObject) {
		// TODO: Potentially caching the IgePoints here unless this._geometry has changed may speed things up somewhat
		var thisG3d = this._geometry,
			thisMin = new IgePoint(
				this._translate.x - thisG3d.x / 2,
				this._translate.y - thisG3d.y / 2,
				this._translate.z - thisG3d.z
			),
			thisMax = new IgePoint(
				this._translate.x + thisG3d.x / 2,
				this._translate.y + thisG3d.y / 2,
				this._translate.z + thisG3d.z
			),
			otherG3d = otherObject._geometry,
			otherMin = new IgePoint(
				otherObject._translate.x - otherG3d.x / 2,
				otherObject._translate.y - otherG3d.y / 2,
				otherObject._translate.z - otherG3d.z
			),
			otherMax = new IgePoint(
				otherObject._translate.x + otherG3d.x / 2,
				otherObject._translate.y + otherG3d.y / 2,
				otherObject._translate.z + otherG3d.z
			);

		return this._internalsOverlap(
			thisMin.x - thisMax.y,
			thisMax.x - thisMin.y,
			otherMin.x - otherMax.y,
			otherMax.x - otherMin.y
		) && this._internalsOverlap(
			thisMin.x - thisMax.z,
			thisMax.x - thisMin.z,
			otherMin.x - otherMax.z,
			otherMax.x - otherMin.z
		) && this._internalsOverlap(
			thisMin.z - thisMax.y,
			thisMax.z - thisMin.y,
			otherMin.z - otherMax.y,
			otherMax.z - otherMin.y
		);
	},

	/**
	 * Compares the current entity's 3d bounds to the passed entity and
	 * determines if the current entity is "behind" the passed one. If an
	 * entity is behind another, it is drawn first during the scenegraph
	 * render phase.
	 * @param {IgeEntity} otherObject The other entity to check this
	 * entity's 3d bounds against.
	 * @example #Determine if this entity is "behind" another entity based on the current depth-sort 
	 *     var behind = entity.isBehind(otherEntity);
	 * @return {Boolean} If true this entity is "behind" the passed entity
	 * or false if not.
	 */
	isBehind: function (otherObject) {
		var thisG3d = this._geometry,
			thisMin = new IgePoint(
				this._translate.x - thisG3d.x / 2,
				this._translate.y - thisG3d.y / 2,
				this._translate.z
			),
			thisMax = new IgePoint(
				this._translate.x + thisG3d.x / 2,
				this._translate.y + thisG3d.y / 2,
				this._translate.z + thisG3d.z
			),
			otherG3d = otherObject._geometry,
			otherMin = new IgePoint(
				otherObject._translate.x - otherG3d.x / 2,
				otherObject._translate.y - otherG3d.y / 2,
				otherObject._translate.z
			),
			otherMax = new IgePoint(
				otherObject._translate.x + otherG3d.x / 2,
				otherObject._translate.y + otherG3d.y / 2,
				otherObject._translate.z + otherG3d.z
			);

		if (thisMax.x <= otherMin.x) {
			return false;
		}

		if (otherMax.x <= thisMin.x) {
			return true;
		}

		if (thisMax.y <= otherMin.y) {
			return false;
		}

		if (otherMax.y <= thisMin.y) {
			return true;
		}

		if (thisMax.z <= otherMin.z) {
			return false;
		}

		if (otherMax.z <= thisMin.z) {
			return true;
		}

		// Entity's are overlapping, calc based on x+y+z
		return ((this._translate.x + this._translate.y + this._translate.z) > (otherObject._translate.x + otherObject._translate.y + otherObject._translate.z));
	},

	/**
	 * Get / set the flag determining if this entity will respond
	 * to mouse interaction or not. When you set a mouse* event e.g.
	 * mouseUp, mouseOver etc this flag will automatically be reset
	 * to true.
	 * @param {Boolean=} val The flag value true or false.
	 * @example #Set entity to ignore mouse events
	 *     entity.mouseEventsActive(false);
	 * @example #Set entity to receive mouse events
	 *     entity.mouseEventsActive(true);
	 * @example #Get current flag value
	 *     var val = entity.mouseEventsActive();
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	mouseEventsActive: function (val) {
		if (val !== undefined) {
			this._mouseEventsActive = val;
			return this;
		}

		return this._mouseEventsActive;
	},

	/**
	 * Determines if the frame alternator value for this entity
	 * matches the engine's frame alternator value. The entity's
	 * frame alternator value will be set to match the engine's
	 * after each call to the entity.tick() method so the return
	 * value of this method can be used to determine if the tick()
	 * method has already been run for this entity.
	 *
	 * This is useful if you have multiple viewports which will
	 * cause the entity tick() method to fire once for each viewport
	 * but you only want to execute update code such as movement etc
	 * on the first time the tick() method is called.
	 * 
	 * @example #Determine if the entity has already had it's tick method called
	 *     var tickAlreadyCalled = entity.newFrame();
	 * @return {Boolean} If false, the entity's tick method has
	 * not yet been processed for this tick.
	 */
	newFrame: function () {
		return ige._frameAlternator !== this._frameAlternatorCurrent;
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to apply
	 * the transformation matrix to.
	 * @example #Transform a canvas context to the entity's local matrix values
	 *     var canvas = document.createElement('canvas');
	 *     canvas.width = 800;
	 *     canvas.height = 600;
	 *
	 *     var ctx = canvas.getContext('2d');
	 *     entity._transformContext(ctx);
	 * @private
	 */
	_transformContext: function (ctx) {
		if (this._parent) {
			// TODO: Does this only work one level deep? we need to alter a _worldOpacity property down the chain
			ctx.globalAlpha = this._parent._opacity * this._opacity;
		} else {
			ctx.globalAlpha = this._opacity;
		}

		this._localMatrix.transformRenderingContext(ctx);
	},
	
	update: function (ctx) {
		// Check if the entity should still exist
		if (this._deathTime !== undefined && this._deathTime <= ige._tickStart) {
			// The entity should be removed because it has died
			this.destroy();
		} else {
			// Remove the stream data cache
			delete this._streamDataCache;

			// Process any behaviours assigned to the entity
			this._processUpdateBehaviours(ctx);

			if (this._timeStream.length) {
				// Process any interpolation
				this._processInterpolate(ige._tickStart - ige.network.stream._renderLatency);
			}

			// Check for changes to the transform values
			// directly without calling the transform methods
			this.updateTransform();

			// Update the aabb
			// TODO: This is wasteful, find a way to determine if a recalc is required rather than doing it every tick
			this.aabb(true);

			this._oldTranslate = this._translate.clone();

			// Update this object's current frame alternator value
			// which allows us to determine if we are still on the
			// same frame
			this._frameAlternatorCurrent = ige._frameAlternator;
		}

		// Process super class
		CLASSNAME.prototype._editNAME_.call(this, ctx);
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 * @param {Boolean} dontTransform If set to true, the tick method will
	 * not transform the context based on the entity's matrices. This is useful
	 * if you have extended the class and want to process down the inheritance
	 * chain but have already transformed the entity in a previous overloaded
	 * method.
	 */
	tick: function (ctx, dontTransform) {
		if (!this._hidden && this._inView && (!this._parent || (this._parent._inView)) && !this._streamJustCreated) {
			// Process any behaviours assigned to the entity
			this._processTickBehaviours(ctx);
			
			// Process any mouse events we need to do
			var mp, aabb, mouseX, mouseY,
				self = this;

			if (this._mouseEventsActive && ige._currentViewport) {
				mp = this.mousePosWorld();

				if (mp) {
					aabb = this.aabb(); //this.localAabb();
					mouseX = mp.x;
					mouseY = mp.y;

					// Check if the current mouse position is inside this aabb
					//if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
					if (aabb.xyInside(mouseX, mouseY) || this._mouseAlwaysInside) {
						// Point is inside the aabb
						ige.input.queueEvent(this, this._mouseInAabb);
					} else {
						if (ige.input.mouseMove) {
							// There is a mouse move event but we are not inside the entity
							// so fire a mouse out event (_handleMouseOut will check if the
							// mouse WAS inside before firing an out event).
							self._handleMouseOut(ige.input.mouseMove);
						}
					}
				}
			}

			// Transform the context by the current transform settings
			if (!dontTransform) {
				this._transformContext(ctx);
			}

			if (!this._dontRender) {
				// Check for cached version
				if (this._cache) {
					// Caching is enabled
					if (!this._cacheDirty) {
						this._renderCache(ctx);
					} else {
						// The cache is not clean so re-draw it
						// Render the entity to the cache
						var _canvas = this._cacheCanvas,
							_ctx = this._cacheCtx;

						if (this._geometry.x > 0 && this._geometry.y > 0) {
							_canvas.width = this._geometry.x;
							_canvas.height = this._geometry.y;
						} else {
							// We cannot set a zero size for a canvas, it will
							// cause the browser to freak out
							_canvas.width = 1;
							_canvas.height = 1;
						}

						// Translate to the center of the canvas
						_ctx.translate(this._geometry.x2, this._geometry.y2);

						this._renderEntity(_ctx, dontTransform);
						this._renderCache(ctx);
						this._cacheDirty = false;
					}
				} else {
					// Render the entity
					this._renderEntity(ctx, dontTransform);
				}
			}

			// Process any automatic-mode stream updating required
			if (this._streamMode === 1) {
				this.streamSync();
			}

			// Process children
			CLASSNAME.prototype._editNAME_.call(this, ctx);
		}
	},

	/**
	 * Handles calling the texture.render() method if a texture
	 * is applied to the entity. This part of the tick process has
	 * been abstracted to allow it to be overridden by an extending
	 * class.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render
	 * the entity to.
	 * @private
	 */
	_renderEntity: function (ctx) {
		if (this._opacity > 0) {
			// Check if the entity has a background pattern
			if (this._backgroundPattern) {
				if (!this._backgroundPatternFill) {
					// We have a pattern but no fill produced
					// from it. Check if we have a context to
					// generate a pattern from
					if (ctx) {
						// Produce the pattern fill
						this._backgroundPatternFill = ctx.createPattern(this._backgroundPattern.image, this._backgroundPatternRepeat);
					}
				}

				if (this._backgroundPatternFill) {
					// Draw the fill
					ctx.save();
					ctx.fillStyle = this._backgroundPatternFill;

					// TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change

					// This is the proper way to do this but firefox has a bug which I'm gonna report
					// so instead I have to use ANOTHER translate call instead. So crap!
					//ctx.rect(-this._geometry.x2, -this._geometry.y2, this._geometry.x, this._geometry.y);
					ctx.translate(-this._geometry.x2, -this._geometry.y2);
					ctx.rect(0, 0, this._geometry.x, this._geometry.y);
					if (this._backgroundPatternTrackCamera) {
						ctx.translate(-ige._currentCamera._translate.x, -ige._currentCamera._translate.y);
						ctx.scale(ige._currentCamera._scale.x, ige._currentCamera._scale.y);
					}
					ctx.fill();
					ige._drawCount++;

					if (this._backgroundPatternIsoTile) {
						ctx.translate(-Math.floor(this._backgroundPattern.image.width) / 2, -Math.floor(this._backgroundPattern.image.height / 2));
						ctx.fill();
						ige._drawCount++;
					}

					ctx.restore();
				}
			}

			var texture = this._texture;

			// Check if the entity is visible based upon its opacity
			if (texture && texture._loaded) {
				// Draw the entity image
				texture.render(ctx, this, ige._tickDelta);

				if (this._highlight) {
					ctx.globalCompositeOperation = 'lighter';
					texture.render(ctx, this);
				}
			}
		}
	},

	/**
	 * Draws the cached off-screen canvas image data to the passed canvas
	 * context.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render
	 * the entity to.
	 * @private
	 */
	_renderCache: function (ctx) {
		// We have a clean cached version so output that
		ctx.drawImage(
			this._cacheCanvas,
			-this._geometry.x2, -this._geometry.y2
		);

		ige._drawCount++;

		if (this._highlight) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(
				this._cacheCanvas,
				-this._geometry.x2, -this._geometry.y2
			);

			ige._drawCount++;
		}
	},

	/**
	 * Transforms a point by the entity's parent world matrix and
	 * it's own local matrix transforming the point to this entity's
	 * world space.
	 * @param {IgePoint} point The point to transform.
	 * @example #Transform a point by the entity's world matrix values
	 *     var point = new IgePoint(0, 0, 0);
	 *     entity._transformPoint(point);
	 *     
	 *     console.log(point);
	 * @return {IgePoint} The transformed point.
	 * @private
	 */
	_transformPoint: function (point) {
		if (this._parent) {
			var tempMat = new IgeMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.getInverse().transformCoord(point);
		} else {
			this._localMatrix.transformCoord(point);
		}

		return point;
	},

	/**
	 * Checks mouse input types and fires the correct mouse event
	 * handler. This is an internal method that should never be
	 * called externally.
	 * @param {Object} evc The input component event control object.
	 * @param {Object} data Data passed by the input component into
	 * the new event.
	 * @private
	 */
	_mouseInAabb: function (evc, data) {
		if (ige.input.mouseMove) {
			// There is a mouse move event
			this._handleMouseIn(ige.input.mouseMove, evc, data);
		}

		if (ige.input.mouseDown) {
			// There is a mouse down event
			this._handleMouseDown(ige.input.mouseDown, evc, data);
		}

		if (ige.input.mouseUp) {
			// There is a mouse up event
			this._handleMouseUp(ige.input.mouseUp, evc, data);
		}
	},

	/**
	 * Generates a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String} The string code fragment that will
	 * reproduce this entity when evaluated.
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = CLASSNAME.prototype._editNAME_.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_opacity':
						str += ".opacity(" + this.opacity() + ")";
						break;
					case '_texture':
						str += ".texture(ige.$('" + this.texture().id() + "'))";
						break;
					case '_cell':
						str += ".cell(" + this.cell() + ")";
						break;
					case '_translate':
						str += ".translateTo(" + this._translate.x + ", " + this._translate.y + ", " + this._translate.z + ")";
						break;
					case '_rotate':
						str += ".rotateTo(" + this._rotate.x + ", " + this._rotate.y + ", " + this._rotate.z + ")";
						break;
					case '_scale':
						str += ".scaleTo(" + this._scale.x + ", " + this._scale.y + ", " + this._scale.z + ")";
						break;
					case '_origin':
						str += ".originTo(" + this._origin.x + ", " + this._origin.y + ", " + this._origin.z + ")";
						break;
					case '_anchor':
						str += ".anchor(" + this._anchor.x + ", " + this._anchor.y + ")";
						break;
					case '_width':
						if (typeof(this.width()) === 'string') {
							str += ".width('" + this.width() + "')";
						} else {
							str += ".width(" + this.width() + ")";
						}
						break;
					case '_height':
						if (typeof(this.height()) === 'string') {
							str += ".height('" + this.height() + "')";
						} else {
							str += ".height(" + this.height() + ")";
						}
						break;
					case '_geometry':
						str += ".size3d(" + this._geometry.x + ", " + this._geometry.y + ", " + this._geometry.z + ")";
						break;
					case '_deathTime':
						str += ".deathTime(" + this.deathTime() + ")";
						break;
					case '_highlight':
						str += ".highlight(" + this.highlight() + ")";
						break;
				}
			}
		}

		return str;
	},

	/**
	 * Destroys the entity by removing it from the scenegraph,
	 * calling destroy() on any child entities and removing
	 * any active event listeners for the entity. Once an entity
	 * has been destroyed it's this._alive flag is also set to
	 * false.
	 * @example #Destroy the entity
	 *     entity.destroy();
	 */
	destroy: function () {
		this._alive = false;
		this.emit('destroyed', this);

		

		// Call IgeObject.destroy()
		CLASSNAME.prototype._editNAME_.call(this);
	},

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERACTION
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Gets / sets the callback that is fired when a mouse
	 * move event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse move event and stop it propagating further down the scenegraph
	 *     entity.mouseMove(function (event, control) {
	 *         // Mouse moved with button
	 *         console.log('Mouse move button: ' + event.button);
	 *         
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *         
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseMove: function (callback) {
		if (callback) {
			this._mouseMove = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseMove;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * move event is triggered.
	 */
	mouseMoveOff: function () {
		delete this._mouseMove;

		return this;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * over event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse over event and stop it propagating further down the scenegraph
	 *     entity.mouseOver(function (event, control) {
	 *         // Mouse over with button
	 *         console.log('Mouse over button: ' + event.button);
	 *         
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *         
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseOver: function (callback) {
		if (callback) {
			this._mouseOver = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOver;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * over event is triggered.
	 */
	mouseOverOff: function () {
		delete this._mouseOver;

		return this;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * out event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse out event and stop it propagating further down the scenegraph
	 *     entity.mouseOut(function (event, control) {
	 *         // Mouse out with button
	 *         console.log('Mouse out button: ' + event.button);
	 *         
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *         
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseOut: function (callback) {
		if (callback) {
			this._mouseOut = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOut;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * out event is triggered.
	 */
	mouseOutOff: function () {
		delete this._mouseOut;

		return this;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * up event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse up event and stop it propagating further down the scenegraph
	 *     entity.mouseUp(function (event, control) {
	 *         // Mouse up with button
	 *         console.log('Mouse up button: ' + event.button);
	 *         
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *         
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseUp: function (callback) {
		if (callback) {
			this._mouseUp = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseUp;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * up event is triggered.
	 */
	mouseUpOff: function () {
		delete this._mouseUp;

		return this;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * down event is triggered.
	 * @param {Function=} callback
	 * @example #Hook the mouse down event and stop it propagating further down the scenegraph
	 *     entity.mouseDown(function (event, control) {
	 *         // Mouse down with button
	 *         console.log('Mouse down button: ' + event.button);
	 *         
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *         
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
	 * @return {*}
	 */
	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseDown;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * down event is triggered.
	 */
	mouseDownOff: function () {
		delete this._mouseDown;

		return this;
	},

	/**
	 * Handler method that determines which mouse-move event
	 * to fire, a mouse-over or a mouse-move.
	 * @private
	 */
	_handleMouseIn: function (event, evc, data) {
		// TODO: Set local mouse point based on 0, 0 at top-left of entity rather than screen
		// Check if the mouse move is a mouse over
		if (!this._mouseStateOver) {
			this._mouseStateOver = true;
			if (this._mouseOver) { this._mouseOver(event, evc, data); }
			
			this.emit('mouseMove', [event, evc, data]);
		}

		if (this._mouseMove) { this._mouseMove(event, evc, data); }
	},

	/**
	 * Handler method that determines if a mouse-out event
	 * should be fired.
	 * @private
	 */
	_handleMouseOut: function (event, evc, data) {
		// The mouse went away from this entity so
		// set mouse-down to false, regardless of the situation
		this._mouseStateDown = false;

		// Check if the mouse move is a mouse out
		if (this._mouseStateOver) {
			this._mouseStateOver = false;
			if (this._mouseOut) { this._mouseOut(event, evc, data); }
			
			this.emit('mouseOut', [event, evc, data]);
		}
	},

	/**
	 * Handler method that determines if a mouse-up event
	 * should be fired.
	 * @private
	 */
	_handleMouseUp: function (event, evc, data) {
		// Reset the mouse-down flag
		this._mouseStateDown = false;
		if (this._mouseUp) { this._mouseUp(event, evc, data); }
		
		this.emit('mouseUp', [event, evc, data]);
	},

	/**
	 * Handler method that determines if a mouse-down event
	 * should be fired.
	 * @private
	 */
	_handleMouseDown: function (event, evc, data) {
		if (!this._mouseStateDown) {
			this._mouseStateDown = true;
			if (this._mouseDown) { this._mouseDown(event, evc, data); }
			
			this.emit('mouseDown', [event, evc, data]);
		}
	},
	
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// TRANSFORM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Translates the entity by adding the passed values to
	 * the current translation values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Translate the entity by 10 along the x axis
	 *     entity.translateBy(10, 0, 0);
	 * @return {*}
	 */
	translateBy: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._translate.x += x;
			this._translate.y += y;
			this._translate.z += z;
		} else {
			this.log('translateBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Translates the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Translate the entity to 10, 0, 0
	 *     entity.translateTo(10, 0, 0);
	 * @return {*}
	 */
	translateTo: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._translate.x = x;
			this._translate.y = y;
			this._translate.z = z;
		} else {
			this.log('translateTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Translates the entity to the passed point.
	 * @param {IgePoint} point The point with co-ordinates.
	 * @example #Translate the entity to 10, 0, 0
	 *     var point = new IgePoint(10, 0, 0),
	 *         entity = new IgeEntity();
	 *     
	 *     entity.translateToPoint(point);
	 * @return {*}
	 */
	translateToPoint: function (point) {
		if (point !== undefined) {
			this._translate.x = point.x;
			this._translate.y = point.y;
			this._translate.z = point.z;
		} else {
			this.log('translateToPoint() called with a missing or undefined point parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the translate accessor object.
	 * @example #Use the translate accessor object to alter the y co-ordinate of the entity to 10
	 *     entity.translate().y(10);
	 * @return {*}
	 */
	translate: function () {
		if (arguments.length) {
			this.log('You called translate with arguments, did you mean translateTo or translateBy instead of translate?', 'warning');
		}

		this.x = this._translateAccessorX;
		this.y = this._translateAccessorY;
		this.z = this._translateAccessorZ;

		return this._entity || this;
	},

	/**
	 * The translate accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorX: function (val) {
		if (val !== undefined) {
			this._translate.x = val;
			return this._entity || this;
		}

		return this._translate.x;
	},

	/**
	 * The translate accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorY: function (val) {
		if (val !== undefined) {
			this._translate.y = val;
			return this._entity || this;
		}

		return this._translate.y;
	},

	/**
	 * The translate accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.translate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_translateAccessorZ: function (val) {
		// TODO: Do we need to do anything to the matrix here for iso views?
		//this._localMatrix.translateTo(this._translate.x, this._translate.y);
		if (val !== undefined) {
			this._translate.z = val;
			return this._entity || this;
		}

		return this._translate.z;
	},

	/**
	 * Rotates the entity by adding the passed values to
	 * the current rotation values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Rotate the entity by 10 degrees about the z axis
	 *     entity.rotateBy(0, 0, Math.radians(10));
	 * @return {*}
	 */
	rotateBy: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._rotate.x += x;
			this._rotate.y += y;
			this._rotate.z += z;
		} else {
			this.log('rotateBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Rotates the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Rotate the entity to 10 degrees about the z axis
	 *     entity.rotateTo(0, 0, Math.radians(10));
	 * @return {*}
	 */
	rotateTo: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._rotate.x = x;
			this._rotate.y = y;
			this._rotate.z = z;
		} else {
			this.log('rotateTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the translate accessor object.
	 * @example #Use the rotate accessor object to rotate the entity about the z axis 10 degrees
	 *     entity.rotate().z(Math.radians(10));
	 * @return {*}
	 */
	rotate: function () {
		if (arguments.length) {
			this.log('You called rotate with arguments, did you mean rotateTo or rotateBy instead of rotate?', 'warning');
		}
		
		this.x = this._rotateAccessorX;
		this.y = this._rotateAccessorY;
		this.z = this._rotateAccessorZ;

		return this._entity || this;
	},

	/**
	 * The rotate accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorX: function (val) {
		if (val !== undefined) {
			this._rotate.x = val;
			return this._entity || this;
		}

		return this._rotate.x;
	},

	/**
	 * The rotate accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorY: function (val) {
		if (val !== undefined) {
			this._rotate.y = val;
			return this._entity || this;
		}

		return this._rotate.y;
	},

	/**
	 * The rotate accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.rotate().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_rotateAccessorZ: function (val) {
		if (val !== undefined) {
			this._rotate.z = val;
			return this._entity || this;
		}

		return this._rotate.z;
	},

	/**
	 * Scales the entity by adding the passed values to
	 * the current scale values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Scale the entity by 2 on the x axis
	 *     entity.scaleBy(2, 0, 0);
	 * @return {*}
	 */
	scaleBy: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._scale.x += x;
			this._scale.y += y;
			this._scale.z += z;
		} else {
			this.log('scaleBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Scale the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Set the entity scale to 1 on all axes
	 *     entity.scaleTo(1, 1, 1);
	 * @return {*}
	 */
	scaleTo: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._scale.x = x;
			this._scale.y = y;
			this._scale.z = z;
		} else {
			this.log('scaleTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the scale accessor object.
	 * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
	 *     entity.scale().x(1);
	 * @return {*}
	 */
	scale: function () {
		if (arguments.length) {
			this.log('You called scale with arguments, did you mean scaleTo or scaleBy instead of scale?', 'warning');
		}
		
		this.x = this._scaleAccessorX;
		this.y = this._scaleAccessorY;
		this.z = this._scaleAccessorZ;

		return this._entity || this;
	},

	/**
	 * The scale accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorX: function (val) {
		if (val !== undefined) {
			this._scale.x = val;
			return this._entity || this;
		}

		return this._scale.x;
	},

	/**
	 * The scale accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorY: function (val) {
		if (val !== undefined) {
			this._scale.y = val;
			return this._entity || this;
		}

		return this._scale.y;
	},

	/**
	 * The scale accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.scale().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_scaleAccessorZ: function (val) {
		if (val !== undefined) {
			this._scale.z = val;
			return this._entity || this;
		}

		return this._scale.z;
	},

	/**
	 * Sets the origin of the entity by adding the passed values to
	 * the current origin values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Add 0.5 to the origin on the x axis
	 *     entity.originBy(0.5, 0, 0);
	 * @return {*}
	 */
	originBy: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._origin.x += x;
			this._origin.y += y;
			this._origin.z += z;
		} else {
			this.log('originBy() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Set the origin of the entity to the passed values.
	 * @param {Number} x The x co-ordinate.
	 * @param {Number} y The y co-ordinate.
	 * @param {Number} z The z co-ordinate.
	 * @example #Set the entity origin to 0.5 on all axes
	 *     entity.originTo(0.5, 0.5, 0.5);
	 * @return {*}
	 */
	originTo: function (x, y, z) {
		if (x !== undefined && y!== undefined && z !== undefined) {
			this._origin.x = x;
			this._origin.y = y;
			this._origin.z = z;
		} else {
			this.log('originTo() called with a missing or undefined x, y or z parameter!', 'error');
		}

		return this._entity || this;
	},

	/**
	 * Gets the origin accessor object.
	 * @example #Use the origin accessor object to set the origin of the entity on the x axis to 1
	 *     entity.origin().x(1);
	 * @return {*}
	 */
	origin: function () {
		this.x = this._originAccessorX;
		this.y = this._originAccessorY;
		this.z = this._originAccessorZ;

		return this._entity || this;
	},

	/**
	 * The origin accessor method for the x axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorX: function (val) {
		if (val !== undefined) {
			this._origin.x = val;
			return this._entity || this;
		}

		return this._origin.x;
	},

	/**
	 * The origin accessor method for the y axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorY: function (val) {
		if (val !== undefined) {
			this._origin.y = val;
			return this._entity || this;
		}

		return this._origin.y;
	},

	/**
	 * The origin accessor method for the z axis. This
	 * method is not called directly but is accessed through
	 * the accessor object obtained by calling entity.origin().
	 * @param {Number=} val The new value to apply to the co-ordinate.
	 * @return {*}
	 * @private
	 */
	_originAccessorZ: function (val) {
		if (val !== undefined) {
			this._origin.z = val;
			return this._entity || this;
		}

		return this._origin.z;
	},

	_rotatePoint: function (point, radians, origin) {
		var cosAngle = Math.cos(radians),
			sinAngle = Math.sin(radians);

		return {
			x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
			y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
		};
	},

	/**
	 * Checks the current transform values against the previous ones. If
	 * any value is different, the appropriate method is called which will
	 * update the transformation matrix accordingly.
	 */
	updateTransform: function () {
		// TODO: Do we need to calc this if the entity transform hasn't changed?
		this._localMatrix.identity();
		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		}

		if (this._mode === 1) {
			// iso translation
			var isoPoint = this._translateIso = new IgePoint(
				this._translate.x,
				this._translate.y,
				this._translate.z + this._geometry.z / 2
			).toIso();

			if (this._parent && this._parent._geometry.z) {
				// This adjusts the child entity so that 0, 0, 0 inside the
				// parent is the center of the base of the parent
				isoPoint.y += this._parent._geometry.z / 1.6;
			}

			this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
		}

		this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));

		// TODO: If the parent and local transforms are unchanged, we should used cached values
		if (this._parent) {
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}
	},

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// STREAM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Gets / sets the array of sections that this entity will
	 * encode into its stream data.
	 * @param {Array=} sectionArray An array of strings.
	 * @example #Define the sections this entity will use in the network stream. Use the default "transform" section as well as a "custom1" section
	 *     entity.streamSections('transform', 'custom1');
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	streamSections: function (sectionArray) {
		if (sectionArray !== undefined) {
			this._streamSections = sectionArray;
			return this;
		}

		return this._streamSections;
	},

	/**
	 * Gets / sets the data for the specified data section id. This method
	 * is usually not called directly and instead is part of the network
	 * stream system. General use case is to write your own custom streamSectionData
	 * method in a class that extends IgeEntity so that you can control the
	 * data that the entity will send and receive over the network stream.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @param {Boolean=} bypassTimeStream If true, will assign transform
	 * directly to entity instead of adding the values to the time stream.
	 * @return {*} "this" when a data argument is passed to allow method
	 * chaining or the current value if no data argument is specified.
	 */
	streamSectionData: function (sectionId, data, bypassTimeStream) {
		if (sectionId === 'transform') {
			if (data) {
				// We have received updated data
				var dataArr = data.split(',');

				if (!bypassTimeStream && !this._streamJustCreated) {
					// Translate
					if (dataArr[0]) { dataArr[0] = parseFloat(dataArr[0]); }
					if (dataArr[1]) { dataArr[1] = parseFloat(dataArr[1]); }
					if (dataArr[2]) { dataArr[2] = parseFloat(dataArr[2]); }

					// Scale
					if (dataArr[3]) { dataArr[3] = parseFloat(dataArr[3]); }
					if (dataArr[4]) { dataArr[4] = parseFloat(dataArr[4]); }
					if (dataArr[5]) { dataArr[5] = parseFloat(dataArr[5]); }

					// Rotate
					if (dataArr[6]) { dataArr[6] = parseFloat(dataArr[6]); }
					if (dataArr[7]) { dataArr[7] = parseFloat(dataArr[7]); }
					if (dataArr[8]) { dataArr[8] = parseFloat(dataArr[8]); }

					// Add it to the time stream
					this._timeStream.push([ige.network.stream._streamDataTime + ige.network._latency, dataArr]);

					// Check stream length, don't allow higher than 10 items
					if (this._timeStream.length > 10) {
						// Remove the first item
						this._timeStream.shift();
					}
				} else {
					// Assign all the transform values immediately
					if (dataArr[0]) { this._translate.x = parseFloat(dataArr[0]); }
					if (dataArr[1]) { this._translate.y = parseFloat(dataArr[1]); }
					if (dataArr[2]) { this._translate.z = parseFloat(dataArr[2]); }

					// Scale
					if (dataArr[3]) { this._scale.x = parseFloat(dataArr[3]); }
					if (dataArr[4]) { this._scale.y = parseFloat(dataArr[4]); }
					if (dataArr[5]) { this._scale.z = parseFloat(dataArr[5]); }

					// Rotate
					if (dataArr[6]) { this._rotate.x = parseFloat(dataArr[6]); }
					if (dataArr[7]) { this._rotate.y = parseFloat(dataArr[7]); }
					if (dataArr[8]) { this._rotate.z = parseFloat(dataArr[8]); }
				}
			} else {
				// We should return stringified data
				return this._translate.toString(this._streamFloatPrecision) + ',' + // translate
					this._scale.toString(this._streamFloatPrecision) + ',' + // scale
					this._rotate.toString(this._streamFloatPrecision) + ','; // rotate
			}
		}
	},

	

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERPOLATOR
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Calculates the current value based on the time along the
	 * value range.
	 * @param {Number} startValue The value that the interpolation started from.
	 * @param {Number} endValue The target value to be interpolated to.
	 * @param {Number} startTime The time the interpolation started.
	 * @param {Number} currentTime The current time.
	 * @param {Number} endTime The time the interpolation will end.
	 * @return {Number} The interpolated value.
	 */
	interpolateValue: function (startValue, endValue, startTime, currentTime, endTime) {
		var totalValue = endValue - startValue,
			dataDelta = endTime - startTime,
			offsetDelta = currentTime - startTime,
			deltaTime = offsetDelta / dataDelta;

		// Clamp the current time from 0 to 1
		if (deltaTime < 0) { deltaTime = 0; } else if (deltaTime > 1) { deltaTime = 1; }

		return (totalValue * deltaTime) + startValue;
	},

	/**
	 * Processes the time stream for the entity.
	 * @param {Number} renderTime The time that the time stream is
	 * targetting to render the entity at.
	 * @param {Number} maxLerp The maximum lerp before the value
	 * is assigned directly instead of being interpolated.
	 * @private
	 */
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
			previousTransform,
			nextTransform,
			currentTransform = [],
			i = 1;

		// Find the point in the time stream that is
		// closest to the render time and assign the
		// previous and next data points
		while (timeStream[i]) {
			if (timeStream[i][0] > renderTime) {
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
					this.emit('interpolationLag');
				}
			}
		} else {
			// We have some new data so clear the old data
			timeStream.splice(0, i - 1);
		}

		// If we have data to use
		if (nextData && previousData) {
			/*previousData = [
				previousData[0],
				[
					this._translate.x,
					this._translate.y,
					this._translate.z,

					this._scale.x,
					this._scale.y,
					this._scale.z,

					this._rotate.x,
					this._rotate.y,
					this._rotate.z
				]
			];*/

			// Store the data so outside systems can access them
			this._timeStreamPreviousData = previousData;
			this._timeStreamNextData = nextData;

			// Calculate the delta times
			dataDelta = nextData[0] - previousData[0];
			offsetDelta = renderTime - previousData[0];

			this._timeStreamDataDelta = Math.floor(dataDelta);
			this._timeStreamOffsetDelta = Math.floor(offsetDelta);

			// Calculate the current time between the two data points
			currentTime = offsetDelta / dataDelta;

			this._timeStreamCurrentInterpolateTime = currentTime;

			// Clamp the current time from 0 to 1
			//if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }

			// Set variables up to store the previous and next data
			previousTransform = previousData[1];
			nextTransform = nextData[1];

			// Translate
			currentTransform[0] = this.interpolateValue(previousTransform[0], nextTransform[0], previousData[0], renderTime, nextData[0]);
			currentTransform[1] = this.interpolateValue(previousTransform[1], nextTransform[1], previousData[0], renderTime, nextData[0]);
			currentTransform[2] = this.interpolateValue(previousTransform[2], nextTransform[2], previousData[0], renderTime, nextData[0]);
			// Scale
			currentTransform[3] = this.interpolateValue(previousTransform[3], nextTransform[3], previousData[0], renderTime, nextData[0]);
			currentTransform[4] = this.interpolateValue(previousTransform[4], nextTransform[4], previousData[0], renderTime, nextData[0]);
			currentTransform[5] = this.interpolateValue(previousTransform[5], nextTransform[5], previousData[0], renderTime, nextData[0]);
			// Rotate
			currentTransform[6] = this.interpolateValue(previousTransform[6], nextTransform[6], previousData[0], renderTime, nextData[0]);
			currentTransform[7] = this.interpolateValue(previousTransform[7], nextTransform[7], previousData[0], renderTime, nextData[0]);
			currentTransform[8] = this.interpolateValue(previousTransform[8], nextTransform[8], previousData[0], renderTime, nextData[0]);

			this.translateTo(parseFloat(currentTransform[0]), parseFloat(currentTransform[1]), parseFloat(currentTransform[2]));
			this.scaleTo(parseFloat(currentTransform[3]), parseFloat(currentTransform[4]), parseFloat(currentTransform[5]));
			this.rotateTo(parseFloat(currentTransform[6]), parseFloat(currentTransform[7]), parseFloat(currentTransform[8]));

			/*// Calculate the squared distance between the previous point and next point
			 dist = this.distanceSquared(previousTransform.x, previousTransform.y, nextTransform.x, nextTransform.y);

			 // Check that the distance is not higher than the maximum lerp and if higher,
			 // set the current time to 1 to snap to the next position immediately
			 if (dist > maxLerpSquared) { currentTime = 1; }

			 // Interpolate the entity position by multiplying the Delta times T, and adding the previous position
			 currentPosition = {};
			 currentPosition.x = ( (nextTransform.x - previousTransform.x) * currentTime ) + previousTransform.x;
			 currentPosition.y = ( (nextTransform.y - previousTransform.y) * currentTime ) + previousTransform.y;

			 // Now actually transform the entity
			 this.translate(entity, currentPosition.x, currentPosition.y);*/

			// Record the last time we updated the entity so we can disregard any updates
			// that arrive and are before this timestamp (not applicable in TCP but will
			// apply if we ever get UDP in websockets)
			this._lastUpdate = new Date().getTime();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; };/**
 * Creates a new map that has two dimensions (x and y) to it's data.
 */
var IgeMap2d = IgeClass.extend({
	classId: 'IgeMap2d',

	init: function (data) {
		this._mapData = data || [];
	},

	/**
	 * Gets / sets a value on the specified map tile co-ordinates.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {*=} val The data to set on the map tile co-ordinate.
	 * @return {*}
	 */
	tileData: function (x, y, val) {
		if (x !== undefined && y !== undefined) {
			if (val !== undefined) {
				// Assign a value
				this._mapData[y] = this._mapData[y] || [];
				this._mapData[y][x] = val;
				return this;
			} else {
				// No assignment so see if we have data to return
				if (this._mapData[y]) {
					return this._mapData[y][x];
				}
			}
		}

		// Either no x, y was specified or there was
		// no data at the x, y so return undefined
		return undefined;
	},

	/**
	 * Clears any data set at the specified map tile co-ordinates.
	 * @param x
	 * @param y
	 * @return {Boolean} True if data was cleared or false if no data existed.
	 */
	clearData: function (x, y) {
		if (x !== undefined && y !== undefined) {
			if (this._mapData[y] !== undefined) {
				delete this._mapData[y][x];
				return true;
			}
		}

		return false;
	},

	/**
	 * Checks if the tile area passed has any data stored in it. If
	 * so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 */
	collision: function (x, y, width, height) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					if (this.tileData(x + xi, y + yi)) {
						return true;
					}
				}
			}
		}

		return false;
	},

	/**
	 * Gets / sets the map's tile data.
	 * @param {Array} val The map data array.
	 * @return {*}
	 */
	mapData: function (val) {
		if (val !== undefined) {
			this._mapData = val;
			return this;
		}

		return this._mapData;
	},

	/**
	 * Returns a string of the map's data in JSON format.
	 * @return {String}
	 */
	mapDataString: function () {
		return JSON.stringify(this.mapData());
	},

	/**
	 * Inserts map data into the map at the given co-ordinates. Please note this
	 * is not used for setting a tile's value. This is used to add large sections
	 * of map data at the specified co-ordinates. To set an individual tile value,
	 * please use tile(x, y, val).
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Array} val The map data array.
	 */
		//TODO: Write this function's internals!
	insertMapData: function (x, y, val) {
		// Loop the data and fill the map data with it
	},

	/**
	 * Rotates map data either -90 degrees (anti-clockwise), 90 degrees (clockwise) or
	 * 180 degrees. Useful when you want to define one section of a map and then re-use
	 * it in slightly different layouts.
	 * @param {Array} val The map data array to rotate.
	 * @param {Number} mode Either -90, 90 or 180 to denote the type of rotation to perform.
	 */
		//TODO: Write this function's internals!
	rotateData: function (val, mode) {
		switch (mode) {
			case -90:
				// Rotate the data
			break;

			case 180:
			break;

			case 90:
			default:
			break;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMap2d; };// TODO: Make the mouse events inactive on tilemaps, instead allow behaviours to be added that call the mouseToTile method and can do things based on that. This solves the problem of tilemaps having arbitrary infinite bounds and allows the programmer to decide which tile maps are being interacted with.
// TODO: Implement the _stringify() method for this class
/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
var IgeTileMap2d = IgeEntity.extend({
	classId: 'IgeTileMap2d',

	init: function (tileWidth, tileHeight) {
		this._alwaysInView = true;
		CLASSNAME.prototype._editNAME_.call(this);

		var self = this;

		this.map = new IgeMap2d();

		this._tileWidth = tileWidth !== undefined ? tileWidth : 40;
		this._tileHeight = tileHeight !== undefined ? tileHeight : 40;

		this._drawGrid = 0;
        this._gridColor = '#ffffff';
	},

	/**
	 * Gets / sets the number of grid cells that the tile map should paint
	 * to the context during the tick method.
	 * @param val
	 * @return {*}
	 */
	drawGrid: function (val)  {
		if (val !== undefined) {
			this._drawGrid = val;
			return this;
		}

		return this._drawGrid;
	},

	/**
	 * Gets / sets the color of the grid overlay. It can accepts a string
	 * @param val
	 * @return {*}
	 */
	gridColor: function (val)  {
		if (val !== undefined) {
			this._gridColor = val;
			return this;
		}

		return this._gridColor;
	},

	/**
	 * Gets / sets the flag that determines if the tile map will paint the
	 * occupied tiles with an overlay colour so that it is easy to spot them.
	 * @param val
	 * @return {*}
	 */
	highlightOccupied: function (val) {
		if (val !== undefined) {
			this._highlightOccupied = val;
			return this;
		}

		return this._highlightOccupied;
	},

	highlightTileRect: function (val) {
		if (val !== undefined) {
			this._highlightTileRect = val;
			return this;
		}

		return this._highlightTileRect;
	},

	/**
	 * Gets / sets the map's tile width.
	 * @param {Number} val Tile width.
	 * @return {*}
	 */
	tileWidth: function (val) {
		if (val !== undefined) {
			this._tileWidth = val;
			return this;
		}

		return this._tileWidth;
	},

	/**
	 * Gets / sets the map's tile height.
	 * @param {Number} val Tile height.
	 * @return {*}
	 */
	tileHeight: function (val) {
		if (val !== undefined) {
			this._tileHeight = val;
			return this;
		}

		return this._tileHeight;
	},

	_childMounted: function (obj) {
		// Augment the child with tile powers!
		obj.occupyTile = this._objectOccupyTile;
		obj.unOccupyTile = this._objectUnOccupyTile;
		obj.overTiles = this._objectOverTiles;

		// We can also re-use the tile size methods since
		// they alter the same properties on the calling
		// entity anyway.
		obj.tileWidth = this.tileWidth;
		obj.tileHeight = this.tileHeight;

		// Set default values
		obj._tileWidth = obj._tileWidth || 1;
		obj._tileHeight = obj._tileHeight || 1;

		CLASSNAME.prototype._editNAME_.call(this, obj);
	},

	/**
	 * This method is attached to objects that are mounted to the tile map.
	 * Adds the object to the tile map at the passed tile co-ordinates. If
	 * no tile co-ordinates are passed, will use the current tile position
	 * and the tileWidth() and tileHeight() values.
	 * @param {Number=} x X co-ordinate of the tile to occupy.
	 * @param {Number=} y Y co-ordinate of the tile to occupy.
	 * @param {Number=} width Number of tiles along the x-axis to occupy.
	 * @param {Number=} height Number of tiles along the y-axis to occupy.
	 * @private
	 */
	_objectOccupyTile: function (x, y, width, height) {
		if (x !== undefined && y !== undefined) {
			this._parent.occupyTile(x, y, width, height, this);
		} else {
			// Occupy tiles based upon tile point and tile width/height
			var trPoint = new IgePoint(this._translate.x - (((this._tileWidth / 2) - 0.5) * this._parent._tileWidth), this._translate.y - (((this._tileHeight / 2) - 0.5) * this._parent._tileHeight), 0),
				tilePoint = this._parent.pointToTile(trPoint);

			if (this._parent._mountMode === 1) {
				tilePoint.thisToIso();
			}

			this._parent.occupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight, this);
		}
		return this;
	},

	/**
	 * This method is attached to objects that are mounted to the tile map.
	 * Removes the object from the tile map at the passed tile co-ordinates.
	 * If no tile co-ordinates are passed, will use the current tile position
	 * and the tileWidth() and tileHeight() values.
	 * @param {Number=} x X co-ordinate of the tile to un-occupy.
	 * @param {Number=} y Y co-ordinate of the tile to un-occupy.
	 * @param {Number=} width Number of tiles along the x-axis to un-occupy.
	 * @param {Number=} height Number of tiles along the y-axis to un-occupy.
	 * @private
	 */
	_objectUnOccupyTile: function (x, y, width, height) {
		if (x !== undefined && y !== undefined) {
			this._parent.unOccupyTile(x, y, width, height);
		} else {
			// Un-occupy tiles based upon tile point and tile width/height
			var trPoint = new IgePoint(this._translate.x - (((this._tileWidth / 2) - 0.5) * this._parent._tileWidth), this._translate.y - (((this._tileHeight / 2) - 0.5) * this._parent._tileHeight), 0),
				tilePoint = this._parent.pointToTile(trPoint);

			if (this._parent._mountMode === 1) {
				tilePoint.thisToIso();
			}

			this._parent.unOccupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight);
		}
		return this;
	},

	/**
	 * This method is attached to objects that are mounted to the tile map.
	 * Returns an array of tile co-ordinates that the object is currently
	 * over, calculated using the current world co-ordinates of the object
	 * as well as it's 3d geometry.
	 * @private
	 * @return {Array} The array of tile co-ordinates as IgePoint instances.
	 */
	_objectOverTiles: function () {
		var x,
			y,
			tileWidth = this._tileWidth || 1,
			tileHeight = this._tileHeight || 1,
			tile = this._parent.pointToTile(this._translate),
			tileArr = [];

		for (x = 0; x < tileWidth; x++) {
			for (y = 0; y < tileHeight; y++) {
				tileArr.push(new IgePoint(tile.x + x, tile.y + y, 0));
			}
		}

		return tileArr;
	},

	_resizeEvent: function (event) {
		if (this._parent) {
			this._geometry = this._parent._geometry.clone();
		}
		CLASSNAME.prototype._editNAME_.call(this, event);
	},

	/**
	 * Sets a tile or area as occupied by the passed obj parameter.
	 * Any previous occupy data on the specified tile or area will be
	 * overwritten.
	 * @param {Number} x X co-ordinate of the tile to un-occupy.
	 * @param {Number} y Y co-ordinate of the tile to un-occupy.
	 * @param {Number} width Number of tiles along the x-axis to occupy.
	 * @param {Number} height Number of tiles along the y-axis to occupy.
	 * @param {*} obj
	 * @return {*}
	 */
	occupyTile: function (x, y, width, height, obj) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					this.map.tileData(x + xi, y + yi, obj);
				}
			}

			// Create an IgeRect to represent the tiles this
			// entity has just occupied
			if (obj._classId) {
				obj._occupiedRect = new IgeRect(x, y, width, height);
			}
		}
		return this;
	},

	/**
	 * Removes all data from the specified tile or area.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	unOccupyTile: function (x, y, width, height) {
		var xi, yi, item;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					item = this.map.tileData(x + xi, y + yi);
					if (item && item._occupiedRect) {
						delete item._occupiedRect;
					}
					this.map.clearData(x + xi, y + yi);
				}
			}


		}
		return this;
	},

	/**
	 * Returns true if the specified tile or tile area has
	 * an occupied status.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	isTileOccupied: function (x, y, width, height) {
		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		return this.map.collision(x, y, width, height);
	},

	tileOccupiedBy: function (x, y) {
		return this.map.tileData(x, y);
	},

	mouseDown: function (val) {
		if (val !== undefined) {
			this._tileMapMouseDown = val;
			return this;
		}

		return this._tileMapMouseDown;
	},

	mouseUp: function (val) {
		if (val !== undefined) {
			this._tileMapMouseUp = val;
			return this;
		}

		return this._tileMapMouseUp;
	},

	mouseOver: function (val) {
		if (val !== undefined) {
			this._tileMapMouseOver = val;
			return this;
		}

		return this._tileMapMouseOver;
	},

	/**
	 * Returns the tile co-ordinates of the tile that the point's world
	 * co-ordinates reside inside.
	 * @param {IgePoint=} point
	 * @return {IgePoint} The tile co-ordinates as a point object.
	 */
	pointToTile: function (point) {
		// TODO: Could this do with some caching to check if the input values have changed and if not, supply the same pre-calculated data if it already exists?
		var mx = point.x,
			my = point.y,
			dx, dy, tilePos;

		if (this._mountMode === 0) {
			// 2d
			dx = mx + this._tileWidth / 2;
			dy = my + this._tileHeight / 2;

			tilePos = new IgePoint(
				Math.floor(dx / this._tileWidth),
				Math.floor(dy / this._tileWidth)
			);
		}

		if (this._mountMode === 1) {
			// iso
			dx = mx;
			dy = my - this._tileHeight / 2;

			tilePos = new IgePoint(
				dx,
				dy,
				0
			).to2d();

			tilePos = new IgePoint(
				Math.floor(tilePos.x / this._tileWidth) + 1,
				Math.floor(tilePos.y / this._tileHeight) + 1
			);
		}

		return tilePos;
	},

	/**
	 * Returns the world co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint}
	 */
	mouseTileWorldXY: function () {
		if (this._mountMode === 0) {
			return this._mouseTilePos
				.clone()
				.thisMultiply(this._tileWidth, this._tileHeight, 0);
		}

		if (this._mountMode === 1) {
			return this._mouseTilePos
				.clone()
				.thisMultiply(this._tileWidth, this._tileHeight, 0)
				.thisToIso();
		}
	},

	/**
	 * Returns the tile co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint}
	 */
	mouseToTile: function () {
		return this.pointToTile(this.mousePos());
	},

	/**
	 * Scans the map data and returns an array of rectangle
	 * objects that encapsulate the map data into discrete
	 * rectangle areas.
	 * @param {Function=} callback Returns true or false for
	 * the passed map data determining if it should be included
	 * in a rectangle or not.
	 * @return {Array}
	 */
	scanRects: function (callback) {
		var x, y,
			rectArray = [],
			mapData = this.map._mapData.clone();

		// Loop the map data and scan for blocks that can
		// be converted into static box2d rectangle areas
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (mapData[y][x] && (!callback || (callback && callback(mapData[y][x], x, y)))) {
							rectArray.push(this._scanRects(mapData, parseInt(x, 10), parseInt(y, 10), callback));
						}
					}
				}
			}
		}

		return rectArray;
	},

	_scanRects: function (mapData, x, y, callback) {
		var rect = {
				x: x,
				y: y,
				width: 1,
				height: 1
			},
			nx = x + 1,
			ny = y + 1;

		// Clear the current x, y cell mapData
		mapData[y][x] = 0;

		while (mapData[y][nx] && (!callback || (callback && callback(mapData[y][nx], nx, y)))) {
			rect.width++;

			// Clear the mapData for this cell
			mapData[y][nx] = 0;

			// Next column
			nx++;
		}

		while (mapData[ny] && mapData[ny][x] && (!callback || (callback && callback(mapData[ny][x], x, ny)))) {
			// Check for mapData either side of the column width
			if ((mapData[ny][x - 1] && (!callback || (callback && callback(mapData[ny][x - 1], x - 1, ny)))) || (mapData[ny][x + rect.width] && (!callback || (callback && callback(mapData[ny][x + rect.width], x + rect.width, ny))))) {
				return rect;
			}

			// Loop the column's map data and check that there is
			// an intact column the same width as the starting column
			for (nx = x; nx < x + rect.width; nx++) {
				if (!mapData[ny][nx] || (callback && !callback(mapData[ny][nx], nx, ny))) {
					// This row has a different column width from the starting
					// column so return the rectangle as it stands
					return rect;
				}
			}

			// Mark the row as cleared
			for (nx = x; nx < x + rect.width; nx++) {
				mapData[ny][nx] = 0;
			}

			rect.height++;
			ny++;
		}

		return rect;
	},

	/**
	 * Sets the internal mouse position data based on the current mouse position
	 * relative to the tile map.
	 * @private
	 */
	_calculateMousePosition: function () {
		this._mouseTilePos = this.pointToTile(this.mousePos());
	},

	tick: function (ctx) {
		var tileWidth = this._tileWidth,
			tileHeight = this._tileHeight,
			index,
			x, y,
			gridMaxX, gridMaxY,
			gStart, gEnd,
			tilePoint,
			gridCount;

		this._calculateMousePosition();

		// Now check if we have any mouse events to call
		if (ige.input.mouseMove && this._tileMapMouseOver) {
			this._tileMapMouseOver(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseMove);
		}

		if (ige.input.mouseDown && this._tileMapMouseDown) {
			this._tileMapMouseDown(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseDown);
		}

		if (ige.input.mouseUp && this._tileMapMouseUp) {
			this._tileMapMouseUp(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseUp);
		}

		// Transform the context ready for drawing
		this._transformContext(ctx);

		// Check if we need to draw the tile grid (usually for debug)
		if (this._drawGrid > 0) {
			ctx.strokeStyle = this._gridColor;
			gridCount = this._drawGrid;
			x = -(tileWidth / 2);
			y = -(tileHeight / 2);
			gridMaxX = x + tileWidth * gridCount;
			gridMaxY = y + tileHeight * gridCount;

			for (index = 0; index <= gridCount; index++) {
				gStart = new IgePoint(x, y + (tileHeight * index), 0);
				gEnd = new IgePoint(gridMaxX, y + (tileHeight * index), 0);

				if (this._mountMode === 1) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}

				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}

			for (index = 0; index <= gridCount; index++) {
				gStart = new IgePoint(x + (tileWidth * index), y, 0);
				gEnd = new IgePoint(x + (tileWidth * index), gridMaxY, 0);

				if (this._mountMode === 1) {
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

		if (this._highlightOccupied) {
			ctx.fillStyle = '#ff0000';
			for (y in this.map._mapData) {
				if (this.map._mapData[y]) {
					for (x in this.map._mapData[y]) {
						if (this.map._mapData[y][x]) {
							// Tile is occupied
							tilePoint = new IgePoint(tileWidth * x, tileHeight * y, 0);

							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (this._mountMode === 0) {
								// 2d
								ctx.fillRect(
									tilePoint.x - tileWidth / 2,
									tilePoint.y - tileHeight / 2,
									tileWidth,
									tileHeight
								);
							}

							if (this._mountMode === 1) {
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
			}
		}

		if (this._highlightTileRect) {
			ctx.fillStyle = '#e4ff00';
			for (y = this._highlightTileRect.y; y < this._highlightTileRect.y + this._highlightTileRect.height; y++) {
				for (x = this._highlightTileRect.x; x < this._highlightTileRect.x + this._highlightTileRect.width; x++) {
					// Tile is occupied
					tilePoint = new IgePoint(tileWidth * x, tileHeight * y, 0);

					// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
					if (this._mountMode === 0) {
						// 2d
						ctx.fillRect(
							tilePoint.x - tileWidth / 2,
							tilePoint.y - tileHeight / 2,
							tileWidth,
							tileHeight
						);
					}

					if (this._mountMode === 1) {
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

		if (this._drawMouse) {
			// Paint the tile the mouse is currently intersecting
			ctx.fillStyle = '#6000ff';
			if (this._mountMode === 0) {
				// 2d
				ctx.fillRect(
					(this._mouseTilePos.x * tileWidth) - tileWidth / 2,
					(this._mouseTilePos.y * tileHeight) - tileHeight / 2,
					tileWidth,
					tileHeight
				);
			}

			if (this._mountMode === 1) {
				// iso
				tilePoint = this._mouseTilePos
					.clone()
					.thisMultiply(tileWidth, tileHeight, 0)
					.thisToIso();

				ctx.beginPath();
				ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
				ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
				ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
				ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
				ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
				ctx.fill();
			}
		}

		CLASSNAME.prototype._editNAME_.call(this, ctx, true);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMap2d; }
;// TODO: Implement the _stringify() method for this class
/**
 * Texture maps provide a way to display textures across a tile map.
 */
var IgeTextureMap = IgeTileMap2d.extend({
	classId: 'IgeTextureMap',

	init: function (tileWidth, tileHeight) {
		CLASSNAME.prototype._editNAME_.call(this, tileWidth, tileHeight);
		this.map = new IgeMap2d();
		this._textureList = [];
		this._renderCenter = new IgePoint(0, 0, 0);
		this._cacheDirty = true;
	},

	/**
	 * Gets / sets the auto sectioning mode. If enabled the texture map
	 * will render to off-screen canvases in sections denoted by the
	 * number passed. For instance if you pass 10, the canvas sections
	 * will be 10x10 tiles in size.
	 * @param {Number=} val The size in tiles of each section.
	 * @return {*}
	 */
	autoSection: function (val) {
		if (val !== undefined) {
			this._autoSection = val;
			return this;
		}

		return this._autoSection;
	},

	/**
	 * Gets / sets the draw sections flag. If true the texture map will
	 * output debug lines between each section of the map when using the
	 * auto section system.
	 * @param {Number=} val The boolean flag value.
	 * @return {*}
	 */
	drawSectionBounds: function (val) {
		if (val !== undefined) {
			this._drawSectionBounds = val;
			return this;
		}

		return this._drawSectionBounds;
	},

	/**
	 * Forces a cache redraw on the next tick.
	 */
	cacheForceFrame: function () {
		this._cacheDirty = true;
	},

	negate: function (entity) {
		if (entity !== undefined) {
			var x, y,
				entityMapData = entity.map._mapData,
				thisMapData = this.map._mapData;

			for (y in entityMapData) {
				if (entityMapData.hasOwnProperty(y)) {
					for (x in entityMapData[y]) {
						if (entityMapData[y].hasOwnProperty(x)) {
							if (thisMapData[y] && thisMapData[y][x]) {
								// This map has data in the same place as the passed
								// entity's map so remove this map's data
								delete thisMapData[y][x];
							}
						}
					}
				}
			}
		}

		return this;
	},

	/**
	 * Adds a texture to the texture map's internal texture list so
	 * that it can be referenced via an index so that the texture map's
	 * data will be something like [[textureId, textureCell]]
	 * or a real world example: [[0, 1], [1, 1]].
	 * @param texture
	 */
	addTexture: function (texture) {
		this._textureList.push(texture);
		if (!texture._loaded) {
			this._allTexturesLoaded = false;
		}
		return this._textureList.length - 1;
	},

	/**
	 * Checks the status of all the textures that have been added to
	 * this texture map and returns true if they are all loaded.
	 * @return {Boolean} True if all textures are loaded, false if
	 * not.
	 */
	allTexturesLoaded: function () {
		if (!this._allTexturesLoaded) {
			var arr = this._textureList,
				arrCount = arr.length;

			while (arrCount--) {
				if (!arr[arrCount]._loaded) {
					return false;
				}
			}
		}

		this._allTexturesLoaded = true;
		return true;
	},

	/**
	 * Sets the specified tile's texture index and cell that will be used
	 * when rendering the texture map.
	 * @param x
	 * @param y
	 * @param textureIndex
	 * @param cell
	 */
	paintTile: function (x, y, textureIndex, cell) {
		if (x !== undefined && y !== undefined && textureIndex !== undefined) {
			if (cell === undefined || cell < 1) {
				cell = 1; // Set the cell default to 1
			}
			this.map.tileData(x, y, [textureIndex, cell]);
		}
	},

	/**
	 * Clears any previous tile texture and cell data for the specified
	 * tile co-ordinates.
	 * @param x
	 * @param y
	 */
	clearTile: function (x, y) {
		this.map.clearData(x, y);
	},

	/**
	 * Reads the map data from a standard map object and fills the map
	 * with the data found.
	 * @param map
	 */
	loadMap: function (map) {
		if (map.textures) {
			// Empty the existing array
			this._textureList = [];

			var tex = [], i,
				self = this;

			// Loop the texture list and create each texture object
			for (i = 0; i < map.textures.length; i++) {
				// Load each texture
				eval('tex[' + i + '] = ' + map.textures[0]);
				self.addTexture(tex[i]);
			}

			// Fill in the map data
			self.map.mapData(map.data);
		} else {
			// Just fill in the map data
			this.map.mapData(map.data);
		}

		return this;
	},

	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 */
	saveMap: function () {
		// in URL format
		var textures = [], i,
			x, y,
			dataX = 0, dataY = 0,
			mapData = this.map._mapData;

		// Grab all the texture definitions
		for (i = 0; i < this._textureList.length; i++) {
			textures.push(this._textureList[i].stringify());
		}

		// Get the lowest x, y
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (x < dataX) {
							dataX = x;
						}

						if (y < dataY) {
							dataY = y;
						}
					}
				}
			}
		}

		return JSON.stringify({
			textures: textures,
			data: this.map.mapDataString(),
			dataXY: [dataX, dataY]
		});
	},

	/**
	 * Gets / sets the specified tile's texture index.
	 * @param x
	 * @param y
	 * @param textureIndex
	 */
	tileTextureIndex: function (x, y, textureIndex) {
		if (x !== undefined && y !== undefined) {
			var obj = this.map.tileData(x, y);
			if (textureIndex !== undefined) {
				// Set the cell
				obj[0] = textureIndex;
			} else {
				return obj[0];
			}
		}
	},

	/**
	 * Gets / sets the specified tile's texture cell.
	 * @param x
	 * @param y
	 * @param cell
	 */
	tileTextureCell: function (x, y, cell) {
		if (x !== undefined && y !== undefined) {
			var obj = this.map.tileData(x, y);
			if (cell !== undefined) {
				// Set the cell
				obj[1] = cell;
			} else {
				return obj[1];
			}
		}
	},

	convertOldData: function (mapData) {
		var newData = [],
			x, y;

		for (x in mapData) {
			if (mapData.hasOwnProperty(x)) {
				for (y in mapData[x]) {
					if (mapData[x].hasOwnProperty(y)) {
						// Grab the tile data to paint
						newData[y] = newData[y] || [];
						newData[y][x] = mapData[x][y];
					}
				}
			}
		}

		console.log(JSON.stringify(newData));
	},

	/**
	 * Handles rendering the texture map during engine tick events.
	 * @param ctx
	 */
	tick: function (ctx) {
		// TODO: This is being called at the wrong time, drawing children before this parent! FIX THIS
		// Run the IgeTileMap2d tick method
		CLASSNAME.prototype._editNAME_.call(this, ctx);

		// Draw each image that has been defined on the map
		var mapData = this.map._mapData,
			x, y,
			tx, ty,
			xInt, yInt,
			finalX, finalY,
			finalPoint,
			tileData, tileEntity = this._newTileEntity(), // TODO: This is wasteful, cache it?
			sectionX, sectionY,
			tempSectionX, tempSectionY,
			_ctx,
			regions, region, i;

		if (this._autoSection > 0) {
			if (this._cacheDirty) {
				// Check that all the textures we need to use are loaded
				if (this.allTexturesLoaded()) {
					// We have a dirty cache so render the section cache
					// data first
				    // TODO: Shouldn't we be replacing these arrays with new ones to drop the old ones from memory?
				    // TODO: Gonna do that now and see what the result is.
                    this._sections = []; //this._sections || [];
                    this._sectionCtx = []; //this._sectionCtx || [];
                    // TODO: This isn't ideal because we are almost certainly dropping sections that are still relevant,
                    // TODO: so we should scan and garbabe collect I think, instead.

					// Loop the map data
					for (y in mapData) {
						if (mapData.hasOwnProperty(y)) {
							for (x in mapData[y]) {
								if (mapData[y].hasOwnProperty(x)) {
									xInt = parseInt(x);
									yInt = parseInt(y);

									// Calculate the tile's final resting position in absolute
									// co-ordinates so we can work out which section canvas to
									// paint the tile to
									if (this._mountMode === 0) {
										// We're rendering a 2d map
										finalX = xInt;
										finalY = yInt;
									}

									if (this._mountMode === 1) {
										// We're rendering an iso map
										// Convert the tile x, y to isometric
										tx = xInt * this._tileWidth;
										ty = yInt * this._tileHeight;
										finalX = (tx - ty) / this._tileWidth;
										finalY = ((tx + ty) * 0.5) / this._tileHeight;
										finalPoint = new IgePoint(finalX, finalY, 0);
										//finalPoint.thisTo2d();

										finalX = finalPoint.x;
										finalY = finalPoint.y;
									}

									// Grab the tile data to paint
									tileData = mapData[y][x];

									// Work out which section to paint to
									sectionX = Math.floor(finalX / this._autoSection);
									sectionY = Math.floor(finalY / this._autoSection);

									this._ensureSectionExists(sectionX, sectionY);

									_ctx = this._sectionCtx[sectionX][sectionY];

									if (tileData) {
										regions = this._renderTile(
											_ctx,
											xInt,
											yInt,
											tileData,
											tileEntity,
											null,
											sectionX,
											sectionY
										);

										// Check if the tile overlapped another section
										if (regions) {
											// Loop the regions and re-render the tile on the
											// other sections that it overlaps
											for (i = 0; i < regions.length; i++) {
												region = regions[i];

												tempSectionX = sectionX;
												tempSectionY = sectionY;

												if (region.x) {
													tempSectionX += region.x;
												}

												if (region.y) {
													tempSectionY += region.y;
												}

												this._ensureSectionExists(tempSectionX, tempSectionY);
												_ctx = this._sectionCtx[tempSectionX][tempSectionY];

												this._sectionTileRegion = this._sectionTileRegion || [];
												this._sectionTileRegion[tempSectionX] = this._sectionTileRegion[tempSectionX] || [];
												this._sectionTileRegion[tempSectionX][tempSectionY] = this._sectionTileRegion[tempSectionX][tempSectionY] || [];
												this._sectionTileRegion[tempSectionX][tempSectionY][xInt] = this._sectionTileRegion[tempSectionX][tempSectionY][xInt] || [];

												if (!this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt]) {
													this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt] = true;

													this._renderTile(
														_ctx,
														xInt,
														yInt,
														tileData,
														tileEntity,
														null,
														tempSectionX,
														tempSectionY
													);
												}
											}
										}
									}
								}
							}
						}
					}

					// Set the cache to clean!
					this._cacheDirty = false;

					// Remove the temporary section tile painted data
					delete this._sectionTileRegion;
				}
			}

			this._drawSectionsToCtx(ctx);
		} else {
			// Render the whole map
			for (y in mapData) {
				if (mapData.hasOwnProperty(y)) {
					for (x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							// Grab the tile data to paint
							tileData = mapData[y][x];

							if (tileData) {
								this._renderTile(ctx, x, y, tileData, tileEntity);
							}
						}
					}
				}
			}
		}
	},

	_ensureSectionExists: function (sectionX, sectionY) {
		var sectionCtx;

		this._sections[sectionX] = this._sections[sectionX] || [];
		this._sectionCtx[sectionX] = this._sectionCtx[sectionX] || [];

		if (!this._sections[sectionX][sectionY]) {
			this._sections[sectionX][sectionY] = document.createElement('canvas');
			this._sections[sectionX][sectionY].width = (this._tileWidth * this._autoSection);
			this._sections[sectionX][sectionY].height = (this._tileHeight * this._autoSection);

			sectionCtx = this._sectionCtx[sectionX][sectionY] = this._sections[sectionX][sectionY].getContext('2d');

			// Ensure the canvas is using the correct image antialiasing mode
			if (!ige._globalSmoothing) {
				sectionCtx.imageSmoothingEnabled = false;
				sectionCtx.webkitImageSmoothingEnabled = false;
				sectionCtx.mozImageSmoothingEnabled = false;
			} else {
				sectionCtx.imageSmoothingEnabled = true;
				sectionCtx.webkitImageSmoothingEnabled = true;
				sectionCtx.mozImageSmoothingEnabled = true;
			}

			// One-time translate the context
			sectionCtx.translate(this._tileWidth / 2, this._tileHeight / 2);
		}
	},

	_drawSectionsToCtx: function (ctx) {
		var x, y, tileData,
			sectionRenderX, sectionRenderY,
			sectionAbsX, sectionAbsY,
			sectionWidth, sectionHeight;

		// Render the map sections
		if (this._mountMode === 1) {
			// Translate the canvas for iso
			ctx.translate(-(this._tileWidth / 2), -(this._tileHeight / 2));
		}

		sectionWidth = (this._tileWidth * this._autoSection);
		sectionHeight = (this._tileHeight * this._autoSection);

		for (x in this._sections) {
			if (this._sections.hasOwnProperty(x)) {
				for (y in this._sections[x]) {
					if (this._sections[x].hasOwnProperty(y)) {
						sectionRenderX = x * (this._tileWidth * this._autoSection);
						sectionRenderY = y * (this._tileHeight * this._autoSection);
						sectionAbsX = this._translate.x + sectionRenderX - ige._currentCamera._translate.x;
						sectionAbsY = this._translate.y + sectionRenderY - ige._currentCamera._translate.y;

						if (this._mountMode === 1) {
							sectionAbsX -= (this._tileWidth / 2);
							sectionAbsY -= (this._tileHeight / 2);
						}

						// Check if the section is "on screen"
						if ((sectionAbsX + sectionWidth + (this._tileHeight / 2) >= -this._geometry.x2 && sectionAbsX - (this._tileWidth / 2) <= this._geometry.x2) && (sectionAbsY + sectionHeight + (this._tileHeight / 2) >= -this._geometry.y2 && sectionAbsY <= this._geometry.y2)) {
							// Grab the canvas to paint
							tileData = this._sections[x][y];

							ctx.drawImage(
								tileData,
								0, 0,
								sectionWidth,
								sectionHeight,
								sectionRenderX,
								sectionRenderY,
								sectionWidth,
								sectionHeight
							);

							ige._drawCount++;

							if (this._drawSectionBounds) {
								// Draw a bounding rectangle around the section
								ctx.strokeStyle = '#ff00f6';
								ctx.strokeRect(
									x * (this._tileWidth * this._autoSection),
									y * (this._tileHeight * this._autoSection),
									(this._tileWidth * this._autoSection),
									(this._tileHeight * this._autoSection)
								);
							}
						}
					}
				}
			}
		}
	},

	/**
	 * Renders a tile texture based on data from the texture map.
	 * @param ctx
	 * @param x
	 * @param y
	 * @param tileData
	 * @param tileEntity
	 * @private
	 */
	_renderTile: function (ctx, x, y, tileData, tileEntity, rect, sectionX, sectionY) {
		// TODO: Handle scaling so tiles don't loose res on scaled cached sections
		var finalX, finalY, regions,
			xm1, xp1, ym1, yp1, regObj,
			xAdjust = this._mountMode === 1 ? this._tileWidth / 2 : 0,
			yAdjust = this._mountMode === 1 ? this._tileHeight / 2 : 0,
			tx, ty, sx, sy,
			texture;

		// Translate the canvas to the tile position
		if (this._mountMode === 0) {
			finalX = x * this._tileWidth;
			finalY = y * this._tileHeight;
		}

		if (this._mountMode === 1) {
			// Convert the tile x, y to isometric
			tx = x * this._tileWidth;
			ty = y * this._tileHeight;
			sx = tx - ty;
			sy = (tx + ty) * 0.5;

			finalX = sx;
			finalY = sy;
		}

		if (sectionX !== undefined) {
			finalX -= sectionX * this._autoSection * this._tileWidth;
		}
		if (sectionY !== undefined) {
			finalY -= sectionY * this._autoSection * this._tileHeight;
		}

		// If we have a rectangle region we are limiting to...
		if (rect) {
			// Check the bounds first
			if (!rect.xyInside(finalX, finalY)) {
				// The point is not inside the bounds, return
				return;
			}
		}

		if (finalX - (xAdjust) < 0) {
			regions = regions || [];
			regions.push({x: -1});
			xm1 = true;

			regObj = regObj || {};
			regObj.x = -1;
		}

		if (finalX + (xAdjust) > (ctx.canvas.width - (this._tileWidth))) {
			regions = regions || [];
			regions.push({x: 1});
			xp1 = true;

			regObj = regObj || {};
			regObj.x = 1;
		}

		if (finalY - (0) < 0) {
			regions = regions || [];
			regions.push({y: -1});
			ym1 = true;

			regObj = regObj || {};
			regObj.y = -1;
		}

		if (finalY + (0) > (ctx.canvas.height - (this._tileHeight))) {
			regions = regions || [];
			regions.push({y: 1});
			yp1 = true;

			regObj = regObj || {};
			regObj.y = 1;
		}

		if (xm1 || ym1 || xp1 || yp1) {
			regions.push(regObj);
		}

		ctx.save();
		ctx.translate(finalX, finalY);

		// Set the correct texture data
		texture = this._textureList[tileData[0]];
		tileEntity._cell = tileData[1];

		// Paint the texture
		texture.render(ctx, tileEntity, ige._tickDelta);
		ctx.restore();

		return regions;
	},

	/**
	 * Creates an entity object that a texture can use to render itself.
	 * This is basically a dummy object that has the minimum amount of data
	 * in it that a texture requires to render such as geometry, texture
	 * cell and rendering position.
	 * @return {Object}
	 * @private
	 */
	_newTileEntity: function () {
		if (this._mountMode === 0) {
			return {
				_cell: 1,
				_geometry: {
					x: this._tileWidth,
					y: this._tileHeight
				},
				_renderPos: {
					x: -this._tileWidth / 2,
					y: -this._tileHeight / 2
				}
			};
		}

		if (this._mountMode === 1) {
			return {
				_cell: 1,
				_geometry: {
					x: this._tileWidth * 2,
					y: this._tileHeight
				},
				_renderPos: {
					x: -this._tileWidth,
					y: -this._tileHeight / 2
				}
			};
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTextureMap; };/**
 * Creates a new camera that will be attached to a viewport.
 */
var IgeCamera = IgeEntity.extend({
	classId: 'IgeCamera',

	init: function (entity) {
		CLASSNAME.prototype._editNAME_.call(this);

		this._trackRotateTarget = undefined;
		this._trackTranslateTarget = undefined;
		this._trackRotateSmoothing = undefined;
		this._trackTranslateSmoothing = undefined;

		// Store the viewport this camera is attached to
		this._entity = entity;
	},

	/**
	 * Gets / sets the rectangle that the camera translate
	 * will be limited to using an IgeRect instance.
	 * @param {IgeRect=} rect
	 * @return {*}
	 */
	limit: function (rect) {
		// TODO: Write the usage of this limit data, currently does nothing
		if (rect !== undefined) {
			this._limit = rect;
			return this._entity;
		}

		return this._limit;
	},

	/**
	 * Pan (tween) the camera to the new specified point in
	 * the specified time.
	 * @param {IgePoint} point The point describing the co-ordinates to pan to.
	 * @param {Number} durationMs The number of milliseconds to span the pan operation over.
	 * @param {String=} easing Optional easing method name.
	 */
	panTo: function (point, durationMs, easing) {
		if (point !== undefined) {
			this._translate.tween()
				.properties({
					x: point.x,
					y: point.y,
					z: point.z
				})
				.duration(durationMs)
				.easing(easing)
				.start();
		}

		return this._entity;
	},

	/**
	 * Pan (tween) the camera by the new specified point in
	 * the specified time.
	 * @param {IgePoint} point The point describing the co-ordinates to pan by.
	 * @param {Number} durationMs The number of milliseconds to span the pan operation over.
	 * @param {String=} easing Optional easing method name.
	 */
	panBy: function (point, durationMs, easing) {
		if (point !== undefined) {
			this._translate.tween()
				.properties({
					x: point.x + this._translate.x,
					y: point.y + this._translate.y,
					z: point.z + this._translate.z
				})
				.duration(durationMs)
				.easing(easing)
				.start();
		}

		return this._entity;
	},

	/**
	 * Tells the camera to track the movement of the specified
	 * target entity. The camera will center on the entity.
	 * @param {IgeEntity} entity
	 * @param {Number=} smoothing Determines how quickly the camera
	 * will track the target, the higher the number, the slower the
	 * tracking will be.
	 * @param {Boolean=} rounding Sets if the smoothing system is
	 * allowed to use floating point values or not. If enabled then
	 * it will not use floating point values.
	 * @return {*}
	 */
	trackTranslate: function (entity, smoothing, rounding) {
		if (entity !== undefined) {
			this.log('Camera on viewport ' + this._entity.id() + ' is now tracking translation target ' + entity.id());
			this._trackTranslateRounding = rounding;
			this._trackTranslateSmoothing = smoothing >= 1  ? smoothing : 0;
			this._trackTranslateTarget = entity;
			return this._entity;
		}

		return this._trackTranslateTarget;
	},

	/**
	 * Gets / sets the translate tracking smoothing value.
	 * @param {Number=} val
	 * @return {*}
	 */
	trackTranslateSmoothing: function (val) {
		if (val !== undefined) {
			this._trackTranslateSmoothing = val;
			return this;
		}

		return this._trackTranslateSmoothing;
	},

	/**
	 * Gets / sets the translate tracking smoothing rounding
	 * either enabled or disabled. When enabled the translate
	 * smoothing value will be rounded so that floating point
	 * values are not used which can help when smoothing on a
	 * scene that has texture smoothing disabled so sub-pixel
	 * rendering doesn't work and objects appear to "snap"
	 * into position as the smoothing interpolates.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	trackTranslateRounding: function (val) {
		if (val !== undefined) {
			this._trackTranslateRounding = val;
			return this;
		}

		return this._trackTranslateRounding;
	},

	/**
	 * Stops tracking the current tracking target's translation.
	 */
	unTrackTranslate: function () {
		delete this._trackTranslateTarget;
	},

	/**
	 * Tells the camera to track the rotation of the specified
	 * target entity.
	 * @param {IgeEntity} entity
	 * @param {Number=} smoothing Determines how quickly the camera
	 * will track the target, the higher the number, the slower the
	 * tracking will be.
	 * @return {*}
	 */
	trackRotate: function (entity, smoothing) {
		if (entity !== undefined) {
			this.log('Camera on viewport ' + this._entity.id() + ' is now tracking rotation of target ' + entity.id());
			this._trackRotateSmoothing = smoothing >= 1 ? smoothing : 0;
			this._trackRotateTarget = entity;
			return this._entity;
		}

		return this._trackRotateTarget;
	},

	/**
	 * Gets / sets the rotate tracking smoothing value.
	 * @param {Number=} val
	 * @return {*}
	 */
	trackRotateSmoothing: function (val) {
		if (val !== undefined) {
			this._trackRotateSmoothing = val;
			return this;
		}

		return this._trackRotateSmoothing;
	},

	/**
	 * Stops tracking the current tracking target.
	 */
	unTrackRotate: function () {
		delete this._trackRotateTarget;
	},

	/**
	 * Translates the camera to the center of the specified entity so
	 * that the camera is "looking at" the entity.
	 * @param {IgeEntity} entity The entity to look at.
	 * @param {Number=} durationMs If specified, will cause the
	 * camera to tween to the location of the entity rather than
	 * snapping to it instantly.
	 * @param {String=} easing The easing method name to use if
	 * tweening by duration.
	 * @return {*}
	 */
	lookAt: function (entity, durationMs, easing) {
		if (entity !== undefined) {
			entity.updateTransform();

			if (!durationMs) {
				// Copy the target's world matrix translate data
				this._translate.x = Math.floor(entity._worldMatrix.matrix[2]);
				this._translate.y = Math.floor(entity._worldMatrix.matrix[5]);
			} else {
				this._translate.tween()
					.properties({
						x: Math.floor(entity._worldMatrix.matrix[2]),
						y: Math.floor(entity._worldMatrix.matrix[5]),
						z: 0
					})
					.duration(durationMs)
					.easing(easing)
					.start();
			}

			this.updateTransform();
		}

		return this;
	},
	
	update: function (ctx) {
		// Check if we are tracking the translate value of a target
		if (this._trackTranslateTarget) {
			var targetEntity = this._trackTranslateTarget,
				targetMatrix = targetEntity._worldMatrix.matrix,
				targetX = targetMatrix[2],
				targetY = targetMatrix[5],
				sourceX, sourceY, distX, distY;

			if (!this._trackTranslateSmoothing) {
				// Copy the target's world matrix translate data
				this.lookAt(this._trackTranslateTarget);
			} else {
				// Ease between the current and target values
				sourceX = this._translate.x;
				sourceY = this._translate.y;

				distX = Math.round(targetX - sourceX);
				distY = Math.round(targetY - sourceY);

				if (this._trackTranslateRounding) {
					this._translate.x += Math.round(distX / this._trackTranslateSmoothing);
					this._translate.y += Math.round(distY / this._trackTranslateSmoothing);
				} else {
					this._translate.x += distX / this._trackTranslateSmoothing;
					this._translate.y += distY / this._trackTranslateSmoothing;
				}
			}
		}

		// Check if we are tracking the rotation values of a target
		if (this._trackRotateTarget) {
			var targetParentRZ = this._trackRotateTarget._parent !== undefined ? this._trackRotateTarget._parent._rotate.z : 0,
				targetZ = -(targetParentRZ + this._trackRotateTarget._rotate.z),
				sourceZ, distZ;

			if (!this._trackRotateSmoothing) {
				// Copy the target's rotate data
				this._rotate.z = targetZ;
			} else {
				// Interpolate between the current and target values
				sourceZ = this._rotate.z;
				distZ = targetZ - sourceZ;

				this._rotate.z += distZ / this._trackRotateSmoothing;
			}
		}

		this.updateTransform();
	},

	/**
	 * Process operations during the engine tick.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	tick: function (ctx) {
		// Updated local transform matrix and then transform the context
		this._localMatrix.transformRenderingContext(ctx);
	},

	/**
	 * Checks the current transform values against the previous ones. If
	 * any value is different, the appropriate method is called which will
	 * update the transformation matrix accordingly. This version of the
	 * method is specifically designed for cameras!
	 */
	updateTransform: function () {
		this._localMatrix.identity();

		// On cameras we do the rotation and scaling FIRST
		this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));

		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(-this._translate.x, -this._translate.y));
		}

		if (this._mode === 1) {
			// iso translation
			var isoPoint = this._translateIso = new IgePoint(
				this._translate.x,
				this._translate.y,
				this._translate.z + this._geometry.z / 2
			).toIso();

			if (this._parent && this._parent._geometry.z) {
				// This adjusts the child entity so that 0, 0, 0 inside the
				// parent is the center of the base of the parent
				isoPoint.y += this._parent._geometry.z / 1.6;
			}

			this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
		}

		if (this._parent) {
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @private
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = CLASSNAME.prototype._editNAME_.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_trackTranslateTarget':
						str += ".trackTranslate(ige.$('" + this._trackTranslateTarget.id() + "'), " + this.trackTranslateSmoothing() + ")";
						break;
					case '_trackRotateTarget':
						str += ".trackRotate(ige.$('" + this._trackRotateTarget.id() + "'), " + this.trackRotateSmoothing() + ")";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeCamera; };// TODO: Implement the _stringify() method for this class
/**
 * Creates a new viewport.
 */
var IgeViewport = IgeEntity.extend([
	{extension: IgeUiStyleExtension, overwrite: true},
	{extension: IgeUiPositionExtension, overwrite: true}
], {
	classId: 'IgeViewport',
	IgeViewport: true,

	init: function (options) {
		this._alwaysInView = true;
		CLASSNAME.prototype._editNAME_.call(this);

		this._mouseAlwaysInside = true;
		this._mousePos = new IgePoint(0, 0, 0);
		this._overflow = '';
		this._uiX = 0;
		this._uiY = 0;

		// Set default options if not specified
		// TODO: Is this required or even used?
		if (options === undefined) {
			options = {
				left: 0,
				top: 0,
				width: ige._geometry.x,
				height: ige._geometry.y,
				autoSize: true
			};
		}

		// Setup default objects
		this._geometry = new IgePoint(options.width || 250, options.height || 150, 0);
		this.camera = new IgeCamera(this);
		this.camera._entity = this;
		//this._drawMouse = true;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the viewport will
	 * automatically resize to fill the entire scene.
	 * @param val
	 * @return {*}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	/**
	 * Gets / sets the scene that the viewport will render.
	 * @param {IgeScene2d} scene
	 * @return {*}
	 */
	scene: function (scene) {
		if (typeof(scene) !== 'undefined') {
			this._scene = scene;
			return this;
		}

		return this._scene;
	},

	/**
	 * Returns the viewport's mouse position.
	 * @return {IgePoint}
	 */
	mousePos: function () {
		// Viewport mouse position is calculated and assigned in the
		// IgeInputComponent class.
		return this._mousePos.clone();
	},
	
	mousePosWorld: function () {
		return this._transformPoint(this._mousePos.clone());
	},

	viewArea: function () {
		var aabb = this.aabb(),
			camTrans = this.camera._translate;

		return new IgeRect(aabb.x + camTrans.x, aabb.y + camTrans.y, aabb.width, aabb.height);
	},

	/**
	 * Processes the updates before the render tick is called.
	 * @param ctx
	 */
	update: function (ctx) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			this.camera.update(ctx);
			CLASSNAME.prototype._editNAME_.call(this, ctx);
			
			if (this._scene.newFrame()) {
				this._scene.update(ctx);
			}
		}
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, scene) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			// Render our scene data
			//ctx.globalAlpha = ctx.globalAlpha * this._parent._opacity * this._opacity;
			CLASSNAME.prototype._editNAME_.call(this, ctx);

			// Translate to the top-left of the viewport
			ctx.translate(
				-(this._geometry.x * this._origin.x) | 0,
				-(this._geometry.y * this._origin.y) | 0
			);

			// Clear the rectangle area of the viewport
			ctx.clearRect(0, 0, this._geometry.x, this._geometry.y);

			// Clip the context so we only draw "inside" the viewport area
			// TODO: CocoonJS doesn't like the ctx.clip() method, find out why
			// and report a bug if required.
			if (!ige.cocoonJs || (ige.cocoonJs && !ige.cocoonJs.detected)) {
				ctx.beginPath();
					ctx.rect(0, 0, this._geometry.x, this._geometry.y);

					// Paint a border if required
					if (this._borderColor) {
						ctx.strokeStyle = this._borderColor;
						ctx.stroke();
					}
				ctx.clip();
			}

			// Translate back to the center of the viewport
			ctx.translate((this._geometry.x / 2) | 0, (this._geometry.y / 2) | 0);

			// Transform the context to the center of the viewport
			// by processing the viewport's camera tick method
			this.camera.tick(ctx);

			// Draw the scene
			ctx.save();
				this._scene.tick(ctx);
			ctx.restore();

			// Check if we should draw bounds on this viewport
			// (usually for debug purposes)
			if (this._drawBounds && ctx === ige._ctx) {
				// Traverse the scenegraph and draw axis-aligned
				// bounding boxes for every object
				ctx.save();
				ctx.translate(-this._translate.x, -this._translate.y);
				this.drawAABBs(ctx, this._scene, 0);
				ctx.restore();
			}

			// Check if we should draw the mouse position on this
			// viewport (usually for debug purposes)
			if (this._drawMouse && ctx === ige._ctx) {
				ctx.save();
					var mp = this.mousePos();

					// Re-scale the context to ensure that output is always 1:1
					ctx.scale(1 / this.camera._scale.x, 1 / this.camera._scale.y);

					// Work out the re-scale mouse position
					var mx = Math.floor(mp.x * this.camera._scale.x),
						my = Math.floor(mp.y * this.camera._scale.y),
						textMeasurement;

					ctx.fillStyle = '#fc00ff';
					ctx.fillRect(mx - 5, my - 5, 10, 10);

					textMeasurement = ctx.measureText('Viewport ' + this.id() + ' :: ' + mx + ', ' + my);
					ctx.fillText('Viewport ' + this.id() + ' :: ' + mx + ', ' + my, mx - textMeasurement.width / 2, my - 15);
				ctx.restore();
			}
		}
	},

	drawBoundsLimitId: function (id) {
		if (id !== undefined) {
			this._drawBoundsLimitId = id;
			return this;
		}

		return this._drawBoundsLimitId;
	},

	drawBoundsLimitCategory: function (category) {
		if (category !== undefined) {
			this._drawBoundsLimitCategory = category;
			return this;
		}

		return this._drawBoundsLimitCategory;
	},

	/**
	 * Draws the bounding data for each entity in the scenegraph.
	 * @param ctx
	 * @param rootObject
	 * @param index
	 */
	drawAABBs: function (ctx, rootObject, index) {
		var arr = rootObject._children,
			arrCount,
			obj,
			aabb,
			ga,
			r3d,
			xl1, xl2, xl3, xl4, xl5, xl6,
			bf1, bf2, bf3, bf4,
			tf1, tf2, tf3, tf4;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				obj = arr[arrCount];
				index++;

				if (obj._shouldRender !== false) {
					if ((!this._drawBoundsLimitId && !this._drawBoundsLimitCategory) || ((this._drawBoundsLimitId && this._drawBoundsLimitId === obj.id()) || (this._drawBoundsLimitCategory && this._drawBoundsLimitCategory === obj.category()))) {
						if (typeof(obj.aabb) === 'function') {
							// Grab the AABB and then draw it
							aabb = obj.aabb();

							if (aabb) {
								if (obj._drawBounds || obj._drawBounds === undefined) {
									ctx.strokeStyle = '#00deff';
									ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);

									// Check if the object is mounted to an isometric mount
									if (obj._parent && obj._parent._mountMode === 1) {
										ctx.save();
											ctx.translate(aabb.x + aabb.width / 2, aabb.y + aabb.height / 2);
											//obj._transformContext(ctx);

											// Calculate the 3d bounds data
											r3d = obj._geometry;
											xl1 = new IgePoint(-(r3d.x / 2), 0, 0).toIso();
											xl2 = new IgePoint(+(r3d.x / 2), 0, 0).toIso();
											xl3 = new IgePoint(0, -(r3d.y / 2), 0).toIso();
											xl4 = new IgePoint(0, +(r3d.y / 2), 0).toIso();
											xl5 = new IgePoint(0, 0, -(r3d.z / 2)).toIso();
											xl6 = new IgePoint(0, 0, +(r3d.z / 2)).toIso();
											// Bottom face
											bf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											// Top face
											tf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();

											ga = ctx.globalAlpha;

											// Axis lines
											ctx.globalAlpha = 1;
											ctx.strokeStyle = '#ff0000';
											ctx.beginPath();
											ctx.moveTo(xl1.x, xl1.y);
											ctx.lineTo(xl2.x, xl2.y);
											ctx.stroke();
											ctx.strokeStyle = '#00ff00';
											ctx.beginPath();
											ctx.moveTo(xl3.x, xl3.y);
											ctx.lineTo(xl4.x, xl4.y);
											ctx.stroke();
											ctx.strokeStyle = '#fffc00';
											ctx.beginPath();
											ctx.moveTo(xl5.x, xl5.y);
											ctx.lineTo(xl6.x, xl6.y);
											ctx.stroke();

											ctx.strokeStyle = '#a200ff';

											ctx.globalAlpha = 0.6;

											// Left face
											ctx.fillStyle = '#545454';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf4.x, bf4.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();

											// Right face
											ctx.fillStyle = '#282828';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf2.x, bf2.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();

											// Top face
											ctx.fillStyle = '#676767';
											ctx.beginPath();
											ctx.moveTo(tf1.x, tf1.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf1.x, tf1.y);
											ctx.fill();
											ctx.stroke();

											ctx.globalAlpha = ga;
										ctx.restore();
									}
								}

								if (this._drawBoundsData  && (obj._drawBounds || obj._drawBoundsData === undefined)) {
									ctx.globalAlpha = 1;
									ctx.fillStyle = '#f6ff00';
									ctx.fillText('ID: ' + obj.id() + ' ' + '(' + obj.classId() + ') ' + obj.layer() + ':' + obj.depth().toFixed(0), aabb.x + aabb.width + 3, aabb.y + 10);
									ctx.fillText('X: ' + obj._translate.x.toFixed(2) + ', ' + 'Y: ' + obj._translate.y.toFixed(2) + ', ' + 'Z: ' + obj._translate.z.toFixed(2), aabb.x + aabb.width + 3, aabb.y + 20);
								}
							}
						}
					}

					this.drawAABBs(ctx, obj, index);
				}
			}
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (this._autoSize && this._parent) {
			this._geometry = this._parent._geometry.clone();
		}

		this._updateUiPosition();

		// Resize the scene
		if (this._scene) {
			this._scene._resizeEvent(event);
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = CLASSNAME.prototype._editNAME_.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_autoSize':
						str += ".autoSize(" + this._autoSize + ")";
						break;
					case '_scene':
						str += ".scene(ige.$('" + this.scene().id() + "'))";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeViewport; };/**
 * Creates a new 2d scene.
 */
var IgeScene2d = IgeEntity.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._mouseAlwaysInside = true;
		this._alwaysInView = true;
		CLASSNAME.prototype._editNAME_.call(this);

		this._shouldRender = true;
		this._autoSize = true;

		// Set the geometry of the scene to the main canvas
		// width / height - used when positioning UI elements
		this._geometry.x = ige._geometry.x;
		this._geometry.y = ige._geometry.y;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the scene will
	 * automatically resize to the engine's canvas geometry.
	 * @param {Boolean=} val If true, will autosize the scene to match the
	 * main canvas geometry. This is enabled by default and is unlikely to
	 * help you if you switch it off.
	 * @return {*}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	/**
	 * Gets / sets the _shouldRender property. If set to true, the scene's child
	 * object's tick methods will be called.
	 * @param {Boolean} val If set to false, no child entities will be rendered.
	 * @return {Boolean}
	 */
	shouldRender: function (val) {
		if (val !== undefined) {
			this._shouldRender = val;
			return this;
		}

		return this._shouldRender;
	},

	/**
	 * Gets / sets the flag that determines if the scene will ignore camera
	 * transform values allowing the scene to remain static on screen
	 * regardless of the camera transform.
	 * @param {Boolean=} val True to ignore, false to not ignore.
	 * @return {*}
	 */
	ignoreCamera: function (val) {
		if (val !== undefined) {
			this._ignoreCamera = val;
			return this;
		}

		return this._ignoreCamera;
	},
	
	update: function (ctx) {
		if (this._ignoreCamera) {
			// Translate the scene so it is always center of the camera
			var cam = ige._currentCamera;
			this.translateTo(cam._translate.x, cam._translate.y, cam._translate.z);
			this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
			this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);
			//this._localMatrix.multiply(ige._currentCamera._worldMatrix.getInverse());
		}
		
		CLASSNAME.prototype._editNAME_.call(this, ctx);
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		if (this._shouldRender) {
			CLASSNAME.prototype._editNAME_.call(this, ctx);
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Set width / height of scene to match main ige (SCENES ARE ALWAYS THE FULL IGE SIZE!!)
		if (this._autoSize) {
			this._geometry = ige._geometry.clone();
		}

		// Resize any children
		var arr = this._children,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = CLASSNAME.prototype._editNAME_.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_shouldRender':
						str += ".shouldRender(" + this.shouldRender() + ")";
						break;
					case '_autoSize':
						str += ".autoSize(" + this.autoSize() + ")";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; };/**
 * The base engine class definition.
 */
var IgeEngine = IgeEntity.extend({
	classId: 'IgeEngine',

	init: function () {
		// Deal with some debug settings first
		if (igeConfig.debug) {
			if (!igeConfig.debug._enabled) {
				// Debug is not enabled so ensure that
				// timing debugs are disabled
				igeConfig.debug._timing = false;
			}
		}

		this._alwaysInView = true;
		CLASSNAME.prototype._editNAME_.call(this);

		this._id = 'ige';
		this.basePath = '';

		// Determine the environment we are executing in
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined');

		// Assign ourselves to the global variable
		ige = this;

		// Output our header
		console.log('------------------------------------------------------------------------------');
		console.log('* Powered by the Isogenic Game Engine ' + igeVersion + '                                  *');
		console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');

		// Call super-class method
		CLASSNAME.prototype._editNAME_.call(this);

		// Check if we should add the CocoonJS support component
		if (!this.isServer) {
			// Enable cocoonJS support because we are running native
			this.addComponent(IgeCocoonJsComponent);
		}

		// Create storage
		this._textureStore = [];

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Setup components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);

		// Set some defaults
		this._renderModes = [
			'2d',
			'three'
		];
		
		this._requireScriptTotal = 0;
		this._requireScriptLoading = 0;
		this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
		this._enableUpdates = true;
		this._enableRenders = true;
		this._showSgTree = false;
		this._debugEvents = {}; // Holds debug event booleans for named events
		this._renderContext = '2d'; // The rendering context, default is 2d
		this._renderMode = this._renderModes[this._renderContext]; // Integer representation of the render context
		this._tickTime = 'NA'; // The time the tick took to process
		this._updateTime = 'NA'; // The time the tick update section took to process
		this._renderTime = 'NA'; // The time the tick render section took to process
		this._tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._state = 0; // Currently stopped
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._dpt = 0;
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._mousePos = new IgePoint(0, 0, 0);
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
		this._currentTime = 0; // The current engine time
		this._globalSmoothing = false; // Determines the default smoothing setting for new textures
		this._register = {
			'ige': this
		}; // Holds a reference to every item in the scenegraph by it's ID
		this._categoryRegister = {}; // Holds reference to every item with a category
		this._groupRegister = {}; // Holds reference to every item with a group
		this._postTick = []; // An array of methods that are called upon tick completion
		this._timeSpentInUpdate = {}; // An object holding time-spent-in-update (total time spent in this object's update method)
		this._timeSpentLastUpdate = {}; // An object holding time-spent-last-update (time spent in this object's update method last tick)
		this._timeSpentInTick = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
		this._timeSpentLastTick = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
		this._timeScale = 1; // The default time scaling factor to speed up or slow down engine time

		// Set the context to a dummy context to start
		// with in case we are in "headless" mode and
		// a replacement context never gets assigned
		this._ctx = IgeDummyContext;
		this._headless = true;

		this.dependencyTimeout(30000); // Wait 30 seconds to load all dependencies then timeout

		// Add the textures loaded dependency
		this._dependencyQueue.push(this.texturesLoaded);
		//this._dependencyQueue.push(this.canvasReady);

		// Start a timer to record every second of execution
		this._secondTimer = setInterval(this._secondTick, 1000);
	},

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param item
	 */
	$: function (item) {
		if (typeof(item) === 'string') {
			return this._register[item];
		} else if (typeof(item) === 'object') {
			return item;
		}

		return this;
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$: function (categoryName) {
		return this._categoryRegister[categoryName] || [];
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$: function (groupName) {
		return this._groupRegister[groupName] || [];
	},

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by it's id with
	 * a call to ige.$(objectId).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	register: function (obj) {
		if (obj !== undefined) {
			if (!this._register[obj.id()]) {
				this._register[obj.id()] = obj;
				obj._registered = true;

				return this;
			} else {
				obj._registered = false;

				this.log('Cannot add object id "' + obj.id() + '" to scenegraph because there is already another object in the graph with the same ID!', 'error');
				return false;
			}
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine object register. The
	 * object will no longer be accessible via ige.$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	unRegister: function (obj) {
		if (obj !== undefined) {
			// Check if the object is registered in the ID lookup
			if (this._register[obj.id()]) {
				delete this._register[obj.id()];
				obj._registered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine category register. The
	 * register allows you to access an object by it's category with
	 * a call to ige.$$(categoryName).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	categoryRegister: function (obj) {
		if (obj !== undefined) {
			this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || [];
			this._categoryRegister[obj._category].push(obj);
			obj._categoryRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine category register. The
	 * object will no longer be accessible via ige.$$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	categoryUnRegister: function (obj) {
		if (obj !== undefined) {
			if (this._categoryRegister[obj._category]) {
				this._categoryRegister[obj._category].pull(obj);
				obj._categoryRegistered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine group register. The
	 * register allows you to access an object by it's groups with
	 * a call to ige.$$$(groupName).
	 * @param {Object} obj The object to register.
	 * @param {String} groupName The name of the group to register
	 * the object in.
	 * @return {*}
	 */
	groupRegister: function (obj, groupName) {
		if (obj !== undefined) {
			this._groupRegister[groupName] = this._groupRegister[groupName] || [];
			this._groupRegister[groupName].push(obj);
			obj._groupRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine group register. The
	 * object will no longer be accessible via ige.$$$().
	 * @param {Object} obj The object to un-register.
	 * @param {String} groupName The name of the group to un-register
	 * the object from.
	 * @return {*}
	 */
	groupUnRegister: function (obj, groupName) {
		if (obj !== undefined) {
			if (groupName !== undefined) {
				if (this._groupRegister[groupName]) {
					this._groupRegister[groupName].pull(obj);

					if (!obj.groupCount()) {
						obj._groupRegister = false;
					}
				}
			} else {
				// Call the removeAllGroups() method which will loop
				// all the groups that the object belongs to and
				// automatically un-register them
				obj.removeAllGroups();
			}
		}

		return this;
	},
	
	requireScript: function (url) {
		if (url !== undefined) {
			var self = this;
			
			// Add to the load counter
			self._requireScriptTotal++;
			self._requireScriptLoading++;
			
			// Create the script element
			var elem = document.createElement('script');
			elem.addEventListener('load', function () {
				self._requireScriptLoaded(this);
			});
			
			// For compatibility with CocoonJS
			document.body.appendChild(elem);
			
			// Set the source to load the url
			elem.src = url;
			
			this.emit('requireScriptLoading', url);
		}
	},
	
	_requireScriptLoaded: function (elem) {
		this._requireScriptLoading--;
		
		this.emit('requireScriptLoaded', elem.src);
		
		if (this._requireScriptLoading === 0) {
			// All scripts have loaded, fire the engine event
			this.emit('allRequireScriptsLoaded');
		}
	},
	
	enableUpdates: function (val) {
		if (val !== undefined) {
			this._enableUpdates = val;
			return this;
		}
		
		return this._enableUpdates;
	},

	enableRenders: function (val) {
		if (val !== undefined) {
			this._enableRenders = val;
			return this;
		}

		return this._enableRenders;
	},
	
	timing: function (val) {
		if (val !== undefined) {
			igeConfig.debug._timing = val;
			return this;
		}

		return igeConfig.debug._timing;
	},

	debug: function (eventName) {
		if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === ige._frames) {
			debugger;
		}
	},

	debugEventOn: function (eventName) {
		this._debugEvents[eventName] = true;
	},

	debugEventOff: function (eventName) {
		this._debugEvents[eventName] = false;
	},

	triggerDebugEventFrame: function (eventName) {
		this._debugEvents[eventName] = ige._frames;
	},

	hideAllExcept: function (id) {
		var i,
			arr = this._register;

		for (i in arr) {
			if (i !== id) {
				arr[i].opacity(0);
			}
		}
	},

	showAll: function () {
		var i,
			arr = this._register;

		for (i in arr) {
			arr[i].show();
		}
	},

	/**
	 * Sets the frame rate at which new engine ticks are fired.
	 * Setting this rate will override the default requestAnimFrame()
	 * method as defined in IgeBase.js and on the client-side, will
	 * stop usage of any available requestAnimationFrame() method
	 * and will use a setTimeout()-based version instead.
	 * @param {Number} fpsRate
	 */
	setFps: function (fpsRate) {
		if (fpsRate !== undefined) {
			// Override the default requestAnimFrame handler and set
			// our own method up so that we can control the frame rate
			if (this.isServer) {
				// Server-side implementation
				requestAnimFrame = function(callback, element){
					setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
				};
			} else {
				// Client-side implementation
				window.requestAnimFrame = function(callback, element){
					setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
				};
			}
		}
	},

	/**
	 * Gets / sets the stats output mode that is in use. Set to 1 to
	 * display default stats output at the lower-left of the HTML page.
	 * @param {Number=} val
	 * @param {Number=} interval The number of milliseconds between stats
	 * updates.
	 */
	showStats: function (val, interval) {
		if (val !== undefined && (!ige.cocoonJs || !ige.cocoonJs.detected)) {
			switch (val) {
				case 0:
					clearInterval(this._statsTimer);
					this._removeStatsDiv();
					break;

				case 1:
					this._createStatsDiv();
					if (interval !== undefined) {
						this._statsInterval = interval;
					} else {
						if (this._statsInterval === undefined) {
							this._statsInterval = 16;
						}
					}
					this._statsTimer = setInterval(this._statsTick, this._statsInterval);
					break;
			}

			this._showStats = val;
			return this;
		}

		return this._showStats;
	},

	/**
	 * Creates the stats output div on the DOM.
	 * @private
	 */
	_createStatsDiv: function () {
		if (!ige.isServer) {
			if (!document.getElementById('igeStats')) {
				// Create the stats div
				var div = document.createElement('div');
				div.id = 'igeStatsFloater';
				div.className = 'igeStatsFloater';
				div.style.fontFamily = 'Verdana, Tahoma';
				div.style.fontSize = "12px";
				div.style.position = 'absolute';
				div.style.color = '#ffffff';
				div.style.textShadow = '1px 1px 3px #000000';
				div.style.bottom = '4px';
				div.style.left = '4px';
				div.style.userSelect = 'none';
				div.style.webkitUserSelect = 'none';
				div.style.MozUserSelect = 'none';
				div.style.zIndex = 100000;
				div.innerHTML = 'Please wait...';

				// Add div to body
				if (document && document.readyState === 'complete') {
					// The page has already loaded so add div now
					document.body.appendChild(div);
				} else {
					// The page is not loaded yet so add a listener
					window.addEventListener('load', function () {
						document.body.appendChild(div);
					});
				}

				window.addEventListener('unload', function () {});

				this._statsDiv = div;
			}
		}
	},

	/**
	 * Removes the stats output div from the DOM.
	 * @private
	 */
	_removeStatsDiv: function () {
		document.body.removeChild(this._statsDiv);
		delete this._statsDiv;
	},

	/**
	 * Defines a class in the engine's class repository.
	 * @param {String} id The unique class ID or name.
	 * @param {Object} obj The class definition.
	 */
	defineClass: function (id, obj) {
		igeClassStore[id] = obj;
	},

	/**
	 * Retrieves a class by it's ID that was defined with
	 * a call to defineClass().
	 * @param {String} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass: function (id) {
		return igeClassStore[id];
	},

	/**
	 * Generates a new instance of a class defined with a call
	 * to the defineClass() method. Passes the options
	 * parameter to the new class during it's constructor call.
	 * @param id
	 * @param options
	 * @return {*}
	 */
	newClassInstance: function (id, options) {
		return new igeClassStore[id](options);
	},

	/**
	 * Checks if all engine start dependencies have been satisfied.
	 * @return {Boolean}
	 */
	dependencyCheck: function () {
		var arr = this._dependencyQueue,
			arrCount = arr.length;

		while (arrCount--) {
			if (!this._dependencyQueue[arrCount]()) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Gets / sets the flag that determines if viewports should be sorted by depth
	 * like regular entities, before they are processed for rendering each frame.
	 * Depth-sorting viewports increases processing requirements so if you do not
	 * need to stack viewports in a particular order, keep this flag false.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	viewportDepth: function (val) {
		if (val !== undefined) {
			this._viewportDepth = val;
			return this;
		}

		return this._viewportDepth;
	},

	/**
	 * Sets the number of milliseconds before the engine gives up waiting for dependencies
	 * to be satisfied and cancels the startup procedure.
	 * @param val
	 */
	dependencyTimeout: function (val) {
		this._dependencyCheckTimeout = val;
	},

	/**
	 * Updates the loading screen DOM elements to show the update progress.
	 */
	updateProgress: function () {
		// Check for a loading progress bar DOM element
		if (typeof(document) !== 'undefined' && document.getElementById) {
			var elem = document.getElementById('loadingProgressBar'),
				textElem = document.getElementById('loadingText');
			
			if (elem) {
				// Calculate the width from progress
				var totalWidth = parseInt(elem.parentNode.offsetWidth),
					currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));
				
				// Set the current bar width
				elem.style.width = currentWidth + 'px';
				
				if (textElem) {
					if (this._loadingPreText === undefined) {
						// Fill the text to use
						this._loadingPreText = textElem.innerHTML;
					}
					textElem.innerHTML = this._loadingPreText + ' ' + Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading)) + '%';
				}
			}
		}
	},

	/**
	 * Adds one to the number of textures currently loading.
	 */
	textureLoadStart: function (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;
		
		this.updateProgress();
		
		this.emit('textureLoadStart', textureObj);
	},

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd: function (url, textureObj) {
		var self = this;
		
		if (!textureObj._destroyed) {
			// Add the texture to the _textureStore array
			this._textureStore.push(textureObj);
		}

		// Decrement the overall loading number
		this._texturesLoading--;
		
		this.updateProgress();
		
		this.emit('textureLoadEnd', textureObj);

		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this.updateProgress();
			
			setTimeout(function () {
				self._allTexturesLoaded();
			}, 100);
		}
	},

	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	textureFromUrl: function (url) {
		var arr = this._textureStore,
			arrCount = arr.length,
			item;

		while (arrCount--) {
			item = arr[arrCount];
			if (item._url === url) {
				return item;
			}
		}
	},

	/**
	 * Checks if all textures have finished loading and returns true if so.
	 * @return {Boolean}
	 */
	texturesLoaded: function () {
		return ige._texturesLoading === 0;
	},

	/**
	 * Emits the "texturesLoaded" event.
	 * @private
	 */
	_allTexturesLoaded: function () {
		if (!this._loggedATL) {
			this._loggedATL = true;
			this.log('All textures have loaded');
		}

		// Fire off an event about this
		this.emit('texturesLoaded');
	},

	/**
	 * Gets / sets the default smoothing value for all new
	 * IgeTexture class instances. If set to true, all newly
	 * created textures will have smoothing enabled by default.
	 * @param val
	 * @return {*}
	 */
	globalSmoothing: function (val) {
		if (val !== undefined) {
			this._globalSmoothing = val;
			return this;
		}

		return this._globalSmoothing;
	},

	/**
	 * Checks to ensure that a canvas has been assigned to the engine or that the
	 * engine is in server mode.
	 * @return {Boolean}
	 */
	canvasReady: function () {
		return (ige._canvas !== undefined || ige.isServer);
	},

	/**
	 * Generates a new unique ID
	 * @return {String}
	 */
	newId: function () {
		this._idCounter++;
		return String(this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17)));
	},

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16);
	},

	/**
	 * Generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {String} str A string to generate the ID from.
	 * @return {String}
	 */
	newIdFromString: function (str) {
		if (str !== undefined) {
			var id,
				val = 0,
				count = str.length,
				i;

			for (i = 0; i < count; i++) {
				val += str.charCodeAt(i) * Math.pow(10, 17);
			}

			id = (val).toString(16);

			// Check if the ID is already in use
			while (ige.$(id)) {
				val += Math.pow(10, 17);
				id = (val).toString(16);
			}

			return id;
		}
	},

	/**
	 * Starts the engine.
	 * @param callback
	 */
	start: function (callback) {
		if (!ige._state) {
			// Check if we are able to start based upon any registered dependencies
			if (ige.dependencyCheck()) {
				// Start the engine
				ige.log('Starting engine...');
				ige._state = 1;

				// Check if we have a DOM, that there is an igeLoading element
				// and if so, remove it from the DOM now
				if (!this.isServer) {
					if (document.getElementsByClassName && document.getElementsByClassName('igeLoading')) {
						var arr = document.getElementsByClassName('igeLoading'),
							arrCount = arr.length;

						while (arrCount--) {
							arr[arrCount].parentNode.removeChild(arr[arrCount]);
						}
					}
				}

				requestAnimFrame(ige.tick);

				ige.log('Engine started');

				// Fire the callback method if there was one
				if (typeof(callback) === 'function') {
					callback(true);
				}
			} else {
				// Get the current timestamp
				var curTime = new Date().getTime();

				// Record when we first started checking for dependencies
				if (!ige._dependencyCheckStart) {
					ige._dependencyCheckStart = curTime;
				}

				// Check if we have timed out
				if (curTime - ige._dependencyCheckStart > this._dependencyCheckTimeout) {
					this.log('Engine start failed because the dependency check timed out after ' + (this._dependencyCheckTimeout / 1000) + ' seconds', 'error');
					if (typeof(callback) === 'function') {
						callback(false);
					}
				} else {
					// Start a timer to keep checking dependencies
					setTimeout(function () { ige.start(callback); }, 200);
				}
			}
		}
	},

	/**
	 * Stops the engine.
	 * @return {Boolean}
	 */
	stop: function () {
		// If we are running, stop the engine
		if (this._state) {
			this.log('Stopping engine...');
			this._state = 0;

			return true;
		} else {
			return false;
		}
	},

	/**
	 * Gets / sets the _autoSize property. If set to true, the engine will listen
	 * for any change in screen size and resize the front-buffer (canvas) element
	 * to match the new screen size.
	 * @param val
	 * @return {Boolean}
	 */
	autoSize: function (val) {
		if (val !== undefined) {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	pixelRatioScaling: function (val) {
		if (val !== undefined) {
			this._pixelRatioScaling = val;
			return this;
		}

		return this._pixelRatioScaling;
	},

	/**
	 * Gets / sets the rendering context that will be used when getting the
	 * context from canvas elements.
	 * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
	 * @return {*}
	 */
	renderContext: function (contextId) {
		if (contextId !== undefined) {
			this._renderContext = contextId;
			this._renderMode = this._renderModes[contextId];

			this.log('Rendering mode set to: ' + contextId);

			return this;
		}

		return this._renderContext;
	},

	/**
	 * Creates a front-buffer or "drawing surface" for the renderer.
	 *
	 * @param {Boolean} autoSize Determines if the canvas will auto-resize
	 * when the browser window changes dimensions. If true the canvas will
	 * automatically fill the window when it is resized.
	 *
	 * @param {Boolean=} dontScale If set to true, IGE will ignore device
	 * pixel ratios when setting the width and height of the canvas and will
	 * therefore not take into account "retina", high-definition displays or
	 * those whose pixel ratio is different from 1 to 1.
	 */
	createFrontBuffer: function (autoSize, dontScale) {
		var self = this;
		if (!this.isServer) {
			if (!this._canvas) {
				this._createdFrontBuffer = true;
				this._pixelRatioScaling = !dontScale;

				this._frontBufferSetup(autoSize, dontScale);
			}
		}
	},

	_frontBufferSetup: function (autoSize, dontScale) {
		// Create a new canvas element to use as the
		// rendering front-buffer
		var tempCanvas = document.createElement('canvas');

		// Set the canvas element id
		tempCanvas.id = 'igeFrontBuffer';

		this.canvas(tempCanvas, autoSize);
		document.body.appendChild(tempCanvas);
	},

	/**
	 * Sets the canvas element that will be used as the front-buffer.
	 * @param elem The canvas element.
	 * @param autoSize If set to true, the engine will automatically size
	 * the canvas to the width and height of the window upon window resize.
	 */
	canvas: function (elem, autoSize) {
		if (elem !== undefined) {
			if (!this._canvas) {
				// Setup front-buffer canvas element
				this._canvas = elem;
				this._ctx = this._canvas.getContext(this._renderContext);

				// Handle pixel ratio settings
				if (this._pixelRatioScaling) {
					// Support high-definition devices and "retina" (stupid marketing name)
					// displays by adjusting for device and back store pixels ratios
					this._devicePixelRatio = window.devicePixelRatio || 1;
					this._backingStoreRatio = this._ctx.webkitBackingStorePixelRatio ||
						this._ctx.mozBackingStorePixelRatio ||
						this._ctx.msBackingStorePixelRatio ||
						this._ctx.oBackingStorePixelRatio ||
						this._ctx.backingStorePixelRatio || 1;

					this._deviceFinalDrawRatio = this._devicePixelRatio / this._backingStoreRatio;
				} else {
					// No auto-scaling
					this._devicePixelRatio = 1;
					this._backingStoreRatio = 1;
					this._deviceFinalDrawRatio = 1;
				}

				if (autoSize) {
					this._autoSize = autoSize;

					// Add some event listeners
					window.addEventListener('resize', this._resizeEvent);
				}

				// Fire the resize event for the first time
				// which sets up initial canvas dimensions
				this._resizeEvent();
				this._ctx = this._canvas.getContext(this._renderContext);
				this._headless = false;

				// Ask the input component to setup any listeners it has
				this.input.setupListeners(this._canvas);
			}
		}

		return this._canvas;
	},

	/**
	 * Clears the entire canvas.
	 */
	clearCanvas: function () {
		if (this._ctx) {
			// Clear the whole canvas
			this._ctx.clearRect(
				0,
				0,
				this._canvas.width,
				this._canvas.height
			);
		}
	},

	removeCanvas: function () {
		// Stop listening for input events
		if (this.input) {
			this.input.destroyListeners();
		}

		// If we were auto-sizing, remove event listener
		if (this._autoSize) {
			window.removeEventListener('resize', this._resizeEvent);
		}

		if (this._createdFrontBuffer) {
			// Remove the canvas from the DOM
			document.body.removeChild(this._canvas);
		}

		// Clear internal references
		delete this._canvas;
		delete this._ctx;
		this._ctx = IgeDummyContext;
		this._headless = true;
	},

	/**
	 * Opens a new window to the specified url. When running in a
	 * native wrapper, will load the url in place of any existing
	 * page being displayed in the native web view.
	 * @param url
	 */
	openUrl: function (url) {
		if (url !== undefined) {

			if (ige.cocoonJs && ige.cocoonJs.detected) {
				// Open URL via CocoonJS webview
				ige.cocoonJs.openUrl(url);
			} else {
				// Open via standard JS open window
				window.open(url);
			}
		}
	},

	/**
	 * Loads the specified URL as an HTML overlay on top of the
	 * front buffer in an iFrame. If running in a native wrapper,
	 * will load the url in place of any existing page being
	 * displayed in the native web view.
	 *
	 * When the overlay is in use, no mouse or touch events will
	 * be fired on the front buffer. Once you are finished with the
	 * overlay, call hideOverlay() to re-enable interaction with
	 * the front buffer.
	 * @param {String=} url
	 */
	showWebView: function (url) {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Open URL via CocoonJS webview
			ige.cocoonJs.showWebView(url);
		} else {
			// Load the iFrame url
			var overlay = document.getElementById('igeOverlay');

			if (!overlay) {
				// No overlay was found, create one
				overlay = document.createElement('iframe');

				// Setup overlay styles
				overlay.id = 'igeOverlay';
				overlay.style.position = 'absolute';
				overlay.style.border = 'none';
				overlay.style.left = '0px';
				overlay.style.top = '0px';
				overlay.style.width = '100%';
				overlay.style.height = '100%';

				// Append overlay to body
				document.body.appendChild(overlay);
			}

			// If we have a url, set it now
			if (url !== undefined) {
				overlay.src = url;
			}

			// Show the overlay
			overlay.style.display = 'block';
		}

		return this;
	},

	/**
	 * Hides the web view overlay.
	 * @return {*}
	 */
	hideWebView: function () {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Hide the cocoonJS webview
			ige.cocoonJs.hideWebView();
		} else {
			var overlay = document.getElementById('igeOverlay');
			if (overlay) {
				overlay.style.display = 'none';
			}
		}

		return this;
	},

	/**
	 * Evaluates javascript sent from another frame.
	 * @param js
	 */
	layerCall: function (js) {
		if (js !== undefined) {
			eval(js);
		}
	},

	/**
	 * Returns the mouse position relative to the main front buffer.
	 * @return {IgePoint}
	 */
	mousePos: function () {
		return this._mousePos;
	},

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (ige._autoSize) {
			var newWidth = window.innerWidth,
				newHeight = window.innerHeight,
				arr = ige._children,
				arrCount = arr.length;

			// Only update canvas dimensions if it exists
			if (ige._canvas) {
				// Make sure we can divide the new width and height by 2...
				// otherwise minus 1 so we get an even number so that we
				// negate the blur effect of sub-pixel rendering
				if (newWidth % 2) { newWidth--; }
				if (newHeight % 2) { newHeight--; }

				ige._canvas.width = newWidth * ige._deviceFinalDrawRatio;
				ige._canvas.height = newHeight * ige._deviceFinalDrawRatio;

				if (ige._deviceFinalDrawRatio !== 1) {
					ige._canvas.style.width = newWidth + 'px';
					ige._canvas.style.height = newHeight + 'px';

					// Scale the canvas context to account for the change
					ige._ctx.scale(ige._deviceFinalDrawRatio, ige._deviceFinalDrawRatio);
				}
			}

			ige._geometry = new IgePoint(newWidth, newHeight, 0);

			// Loop any mounted children and check if
			// they should also get resized
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		} else {
			if (ige._canvas) {
				ige._geometry = new IgePoint(ige._canvas.width, ige._canvas.height, 0);
			}
		}

		if (ige._showSgTree) {
			document.getElementById('igeSgTree').style.height = (ige._geometry.y - 30) + 'px';
		}

		ige._resized = true;
	},

	/**
	 * Adds a new watch expression to the watch list which will be
	 * displayed in the stats overlay during a call to _statsTick().
	 * @param {*} evalStringOrObject The expression to evaluate and
	 * display the result of in the stats overlay, or an object that
	 * contains a "value" property.
	 * @returns {Integer} The index of the new watch expression you
	 * just added to the watch array.
	 */
	watchStart: function (evalStringOrObject) {
		this._watch = this._watch || [];
		this._watch.push(evalStringOrObject);

		return this._watch.length - 1;
	},

	/**
	 * Removes a watch expression by it's array index.
	 * @param {Number} index The index of the watch expression to
	 * remove from the watch array.
	 */
	watchStop: function (index) {
		this._watch = this._watch || [];
		this._watch.splice(index, 1);
	},

	/**
	 * Sets a trace up on the setter of the passed object's
	 * specified property. When the property is set by any
	 * code the debugger line is activated and code execution
	 * will be paused allowing you to step through code or
	 * examine the call stack to see where the property set
	 * originated.
	 * @param {Object} obj The object whose property you want
	 * to trace.
	 * @param {String} propName The name of the property you
	 * want to put the trace on.
	 * @param {Number} sampleCount The number of times you
	 * want the trace to break with the debugger line before
	 * automatically switching off the trace.
	 */
	traceSet: function (obj, propName, sampleCount) {
		obj.___igeTraceCurrentVal = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			get: function () {
				return this.___igeTraceCurrentVal;
			},
			set: function (val) {
				debugger;
				this.___igeTraceCurrentVal = val;
				this.___igeTraceCount++;

				if (this.___igeTraceCount === this.___igeTraceMax) {
					// Maximum amount of trace samples reached, turn off
					// the trace system
					ige.traceSetOff(obj, propName);
				}
			}
		});
	},

	/**
	 * Turns off a trace that was created by calling traceSet.
	 * @param {Object} object The object whose property you want
	 * to disable a trace against.
	 * @param {String} propName The name of the property you
	 * want to disable the trace for.
	 */
	traceSetOff: function (object, propName) {
		Object.defineProperty(object, propName, {set: function (val) { this.___igeTraceCurrentVal = val; }});
	},

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass: function (obj) {
		if (obj._classId.substr(0, 3) === 'Ige') {
			return obj._classId;
		} else {
			if (obj.__proto__._classId) { 
				return this.findBaseClass(obj.__proto__);
			} else {
				return '';
			}
		}
	},

	/**
	 * Returns an array of all classes the passed object derives from
	 * in order from base to current.
	 * @param obj
	 * @param arr
	 * @return {*}
	 */
	getClassDerivedList: function (obj, arr) {
		if (!arr) {
			arr = [];
		} else {
			if (obj._classId) {
				arr.push(obj._classId);
			}
		}
		
		if (obj.__proto__._classId) {
			this.getClassDerivedList(obj.__proto__, arr);
		}
		
		return arr;
	},

	/**
	 * Is called every second and does things like calculate the current FPS.
	 * @private
	 */
	_secondTick: function () {
		var self = ige;

		// Store frames per second
		self._fps = self._frames;

		// Store draws per second
		self._dps = self._dpt * self._fps;

		// Zero out counters
		self._frames = 0;
		self._drawCount = 0;
	},

	addToSgTree: function (item) {
		var elem = document.createElement('li'),
			arr,
			arrCount,
			i,
			mouseUp,
			dblClick,
			timingString;

		mouseUp = function (event) {
			event.stopPropagation();

			var elems = document.getElementsByClassName('sgItem selected');
			for (i = 0; i < elems.length; i++) {
				elems[i].className = 'sgItem';
			}

			this.className += ' selected';
			ige._sgTreeSelected = this.id;

			ige._currentViewport.drawBounds(true);
			if (this.id !== 'ige') {
				ige._currentViewport.drawBoundsLimitId(this.id);
			} else {
				ige._currentViewport.drawBoundsLimitId('');
			}
		};

		dblClick = function (event) {
			event.stopPropagation();
			var console = document.getElementById('igeSgConsole'),
				obj = ige.$(this.id),
				classId = ige.findBaseClass(obj),
				derivedArr,
				classList = '',
				i;

			console.value += "ige.$('" + this.id + "')";
			
			if (classId) {
				// The class is a native engine class so show the doc manual page for it
				document.getElementById('igeSgDocPage').style.display = 'block';
				document.getElementById('igeSgDocPage').src = 'http://www.isogenicengine.com/engine/documentation/root/' + classId + '.html';
				
				derivedArr = ige.getClassDerivedList(obj);
				derivedArr.reverse();
				
				// Build a class breadcrumb
				for (i in derivedArr) {
					if (derivedArr.hasOwnProperty(i)) {
						if (classList) {
							classList += ' &gt ';
						}
						
						if (derivedArr[i].substr(0, 3) === 'Ige') {
							classList += '<a href="' + 'http://www.isogenicengine.com/engine/documentation/root/' + derivedArr[i] + '.html" target="igeSgDocPage">' + derivedArr[i] + '</a>';
						} else {
							classList += derivedArr[i];
						}
					}
				}
				
				// Show the derived class list
				document.getElementById('igeSgItemClassChain').innerHTML = '<B>Inheritance</B>: ' + classList;
				document.getElementById('igeSgItemClassChain').style.display = 'block';
			} else {
				// Not a native class, hide the doc page
				document.getElementById('igeSgItemClassChain').style.display = 'none';
				document.getElementById('igeSgDocPage').style.display = 'none';
			}
		};

		//elem.addEventListener('mouseover', mouseOver, false);
		//elem.addEventListener('mouseout', mouseOut, false);
		elem.addEventListener('mouseup', mouseUp, false);
		elem.addEventListener('dblclick', dblClick, false);

		elem.id = item.id;
		elem.innerHTML = item.text;
		elem.className = 'sgItem';

		if (ige._sgTreeSelected === item.id) {
			elem.className += ' selected';
		}

		if (igeConfig.debug._timing) {
			if (ige._timeSpentInTick[item.id]) {
				timingString = '<span>' + ige._timeSpentInTick[item.id] + 'ms</span>';
				/*if (ige._timeSpentLastTick[item.id]) {
					if (typeof(ige._timeSpentLastTick[item.id].ms) === 'number') {
						timingString += ' | LastTick: ' + ige._timeSpentLastTick[item.id].ms;
					}
				}*/

				elem.innerHTML += ' ' + timingString;
			}
		}

		document.getElementById(item.parentId + '_items').appendChild(elem);

		if (item.items) {
			// Create a ul inside the li
			elem = document.createElement('ul');
			elem.id = item.id + '_items';
			document.getElementById(item.id).appendChild(elem);

			arr = item.items;
			arrCount = arr.length;

			for (i = 0; i < arrCount; i++) {
				ige.addToSgTree(arr[i]);
			}
		}
	},

	/**
	 * Updates the stats HTML overlay with the latest data.
	 * @private
	 */
	_statsTick: function () {
		var self = ige,
			i,
			watchCount,
			watchItem,
			itemName,
			res,
			html = '';

		// Check if the stats output is enabled
		if (self._showStats && !self._statsPauseUpdate) {
			switch (self._showStats) {
				case 1:
					if (self._watch && self._watch.length) {
						watchCount = self._watch.length;

						for (i = 0; i < watchCount; i++) {
							watchItem = self._watch[i];

							if (typeof(watchItem) === 'string') {
								itemName = watchItem;
								try {
									eval('res = ' + watchItem);
								} catch (err) {
									res = '<span style="color:#ff0000;">' + err + '</span>';
								}
							} else {
								itemName = watchItem.name;
								res = watchItem.value;
							}
							html += i + ' (<a href="javascript:ige.watchStop(' + i + '); ige._statsPauseUpdate = false;" style="color:#cccccc;" onmouseover="ige._statsPauseUpdate = true;" onmouseout="ige._statsPauseUpdate = false;">Remove</a>): <span style="color:#7aff80">' + itemName + '</span>: <span style="color:#00c6ff">' + res + '</span><br />';
						}
						html += '<br />';
					}
					html += '<div class="sgButton" title="Show / Hide SceneGraph Tree" onmouseup="ige.toggleShowSceneGraph();">Scene</div> <span class="met" title="Frames Per Second">' + self._fps + ' fps</span> <span class="met" title="Draws Per Second">' + self._dps + ' dps</span> <span class="met" title="Draws Per Tick">' + self._dpt + ' dpt</span> <span class="met" title="Tick Delta (How Long the Last Tick Took)">' + self._tickTime + ' ms\/pt</span> <span class="met" title="Update Delta (How Long the Last Update Took)">' + self._updateTime + ' ms\/ud</span> <span class="met" title="Render Delta (How Long the Last Render Took)">' + self._renderTime + ' ms\/rd</span>';

					if (self.network) {
						// Add the network latency too
						html += ' <span class="met" title="Network Latency (Time From Server to This Client)">' + self.network._latency + ' ms\/net</span>';
					}

					self._statsDiv.innerHTML = html;
					break;
			}
		}
	},

	toggleShowSceneGraph: function () {
		this._showSgTree = !this._showSgTree;

		if (this._showSgTree) {
			// Create the scenegraph tree
			var self = this,
				elem1 = document.createElement('div'),
				elem2;

			elem1.id = 'igeSgTree';
			elem1.style.height = (ige._geometry.y - 30) + 'px';
			elem1.style.overflow = 'auto';
			elem1.addEventListener('mousemove', function (event) {
				event.stopPropagation();
			});
			elem1.addEventListener('mouseup', function (event) {
				event.stopPropagation();
			});
			elem1.addEventListener('mousedown', function (event) {
				event.stopPropagation();
			});

			elem2 = document.createElement('ul');
			elem2.id = 'sceneGraph_items';
			elem1.appendChild(elem2);

			document.body.appendChild(elem1);
			
			// Create the IGE console
			var consoleHolderElem = document.createElement('div'),
				consoleElem = document.createElement('input'),
				classChainElem = document.createElement('div'),
				dociFrame = document.createElement('iframe');

			consoleHolderElem.id = 'igeSgConsoleHolder';
			consoleHolderElem.innerHTML = '<div><b>Console</b>: Double-Click a SceneGraph Object to Script it Here</div>';
			
			consoleElem.type = 'text';
			consoleElem.id = 'igeSgConsole';
			
			classChainElem.id = 'igeSgItemClassChain';

			dociFrame.id = 'igeSgDocPage';
			dociFrame.name = 'igeSgDocPage';

			consoleHolderElem.appendChild(consoleElem);
			consoleHolderElem.appendChild(classChainElem);
			consoleHolderElem.appendChild(dociFrame);
			
			document.body.appendChild(consoleHolderElem);

			this.sgTreeUpdate();
			
			// Now finally, add a refresh button to the scene button
			var button = document.createElement('input');
			button.type = 'button';
			button.id = 'igeSgRefreshTree'
			button.style.position = 'absolute';
			button.style.top = '0px';
			button.style.right = '0px'
			button.value = 'Refresh';
			
			button.addEventListener('click', function () {
				self.sgTreeUpdate();
			}, false);
			
			document.getElementById('igeSgTree').appendChild(button);
		} else {
			var child = document.getElementById('igeSgTree');
			child.parentNode.removeChild(child);

			child = document.getElementById('igeSgConsoleHolder');
			child.parentNode.removeChild(child);
		}
	},
	
	sgTreeUpdate: function () {
		// Update the scenegraph tree
		document.getElementById('sceneGraph_items').innerHTML = '';

		// Get the scenegraph data
		this.addToSgTree(this.getSceneGraphData(this, true));
	},

	timeScale: function (val) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	},

	incrementTime: function (val, lastVal) {
		if (!lastVal) { lastVal = val; }
		this._currentTime += ((val - lastVal) * this._timeScale);
		return this._currentTime;
	},

	/**
	 * Get the current time from the engine.
	 * @return {Number} The current time.
	 */
	currentTime: function () {
		return this._currentTime;
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * schedule it's own ticks or if you want to manually advance
	 * the engine by calling tick when you wish to.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualTicks: function (val) {
		if (val !== undefined) {
			this._useManualTicks = val;
			return this;
		}

		return this._useManualTicks;
	},

	/**
	 * Schedules a manual tick.
	 */
	manualTick: function () {
		if (this._manualFrameAlternator !== this._frameAlternator) {
			this._manualFrameAlternator = this._frameAlternator;
			requestAnimFrame(this.tick);
		}
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * render on every tick or wait for a manualRender() call.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualRender: function (val) {
		if (val !== undefined) {
			this._useManualRender = val;
			return this;
		}

		return this._useManualRender;
	},

	manualRender: function () {
		this._manualRender = true;
	},

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	tick: function (timeStamp, ctx) {
		/* TODO:
			Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
			then process updates and ticks. This will also allow a layered rendering system that can render the
			first x number of entities then stop, allowing a step through of the renderer in realtime
		 */
		var st,
			et,
			updateStart,
			renderStart,
			self = ige,
			ptArr = self._postTick,
			ptCount = ptArr.length,
			ptIndex;

		// Scale the timestamp according to the current
		// engine's time scaling factor
		self.incrementTime(timeStamp, self._timeScaleLastTimestamp);

		self._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(self._currentTime);

		if (igeConfig.debug._timing) {
			st = new Date().getTime();
		}

		if (self._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = self._ctx;
			}

			// Alternate the boolean frame alternator flag
			self._frameAlternator = !self._frameAlternator;

			// If the engine is not in manual tick mode...
			if (!ige._useManualTicks) {
				// Schedule a new frame
				requestAnimFrame(self.tick);
			} else {
				self._manualFrameAlternator = !self._frameAlternator;
			}

			// Get the current time in milliseconds
			self._tickStart = timeStamp;

			// Adjust the tickStart value by the difference between
			// the server and the client clocks (this is only applied
			// when running as the client - the server always has a
			// clientNetDiff of zero)
			self._tickStart -= self._clientNetDiff;

			if (!self.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				self.lastTick = 0;
				self._tickDelta = 0;
			} else {
				// Calculate the frame delta
				self._tickDelta = self._tickStart - self.lastTick;
			}

			// Update the scenegraph
			if (self._enableUpdates) {
				if (igeConfig.debug._timing) {
					updateStart = new Date().getTime();
					self.update(ctx);
					ige._updateTime = new Date().getTime() - updateStart;
				} else {
					self.update(ctx);
				}
			}
			
			// Render the scenegraph
			if (self._enableRenders) {
				if (!self._useManualRender) {
					if (igeConfig.debug._timing) {
						renderStart = new Date().getTime();
						self.render(ctx);
						ige._renderTime = new Date().getTime() - renderStart;
					} else {
						self.render(ctx);
					}
				} else {
					if (self._manualRender) {
						if (igeConfig.debug._timing) {
							renderStart = new Date().getTime();
							self.render(ctx);
							ige._renderTime = new Date().getTime() - renderStart;
						} else {
							self.render(ctx);
						}
						self._manualRender = false;
					}
				}
			}

			// Call post-tick methods
			for (ptIndex = 0; ptIndex < ptCount; ptIndex++) {
				ptArr[ptIndex]();
			}

			// Record the lastTick value so we can
			// calculate delta on the next tick
			self.lastTick = self._tickStart;
			self._frames++;
			self._dpt = self._drawCount;
			self._drawCount = 0;

			// Call the input system tick to reset any flags etc
			self.input.tick();
		}

		self._resized = false;

		if (igeConfig.debug._timing) {
			et = new Date().getTime();
			ige._tickTime = et - st;
		}
	},
	
	update: function (ctx) {
		var arr = this._children,
			arrCount, us, ud;

		// Process any behaviours assigned to the engine
		this._processUpdateBehaviours(ctx);

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their update methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					us = new Date().getTime();
					arr[arrCount].update(ctx);
					ud = new Date().getTime() - us;
					
					if (arr[arrCount]) {
						if (!ige._timeSpentInUpdate[arr[arrCount].id()]) {
							ige._timeSpentInUpdate[arr[arrCount].id()] = 0;
						}

						if (!ige._timeSpentLastUpdate[arr[arrCount].id()]) {
							ige._timeSpentLastUpdate[arr[arrCount].id()] = {};
						}

						ige._timeSpentInUpdate[arr[arrCount].id()] += ud;
						ige._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
					}
				}
			} else {
				while (arrCount--) {
					arr[arrCount].update(ctx);
				}
			}
		}
	},

	render: function (ctx) {
		var ts, td;

		// Process any behaviours assigned to the engine
		this._processTickBehaviours(ctx);

		// Depth-sort the viewports
		if (this._viewportDepth) {
			if (igeConfig.debug._timing) {
				ts = new Date().getTime();
				this.depthSortChildren();
				td = new Date().getTime() - ts;

				if (!ige._timeSpentLastTick[this.id()]) {
					ige._timeSpentLastTick[this.id()] = {};
				}

				ige._timeSpentLastTick[this.id()].depthSortChildren = td;
			} else {
				this.depthSortChildren();
			}
		}

		ctx.save();
		ctx.translate(this._geometry.x2, this._geometry.y2);

		// Process the current engine tick for all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige._timeSpentInTick[arr[arrCount].id()]) {
							ige._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
							ige._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						ige._timeSpentInTick[arr[arrCount].id()] += td;
						ige._timeSpentLastTick[arr[arrCount].id()].ms = td;
					}
					ctx.restore();
				}
			} else {
				while (arrCount--) {
					ctx.save();
					arr[arrCount].tick(ctx);
					ctx.restore();
				}
			}
		}

		ctx.restore();
	},

	fps: function () {
		return this._fps;
	},

	dpt: function () {
		return this._dpt;
	},

	dps: function () {
		return this._dps;
	},

	analyseTiming: function () {
		if (igeConfig.debug._timing) {

		} else {
			this.log('Cannot analyse timing because the igeConfig.debug._timing flag is not enabled so no timing data has been recorded!', 'warning');
		}
	},

	saveSceneGraph: function (item) {
		var arr, arrCount, i;

		if (!item) {
			item = this.getSceneGraphData();
		}

		if (item.obj.stringify) {
			item.str = item.obj.stringify();
		} else {
			console.log('Class ' + item.classId + ' has no stringify() method! For object: ' + item.id, item.obj);
		}
		arr = item.items;

		if (arr) {
			arrCount = arr.length;

			for (i = 0; i < arrCount; i++) {
				this.saveSceneGraph(arr[i]);
			}
		}

		return item;
	},

	/**
	 * Walks the scene graph and outputs a console map of the graph.
	 */
	sceneGraph: function (obj, currentDepth, lastDepth) {
		var depthSpace = '',
			di,
			timingString,
			arr,
			arrCount;

		if (currentDepth === undefined) { currentDepth = 0; }

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		for (di = 0; di < currentDepth; di++) {
			depthSpace += '----';
		}

		if (igeConfig.debug._timing) {
			timingString = '';

			timingString += 'T: ' + ige._timeSpentInTick[obj.id()];
			if (ige._timeSpentLastTick[obj.id()]) {
				if (typeof(ige._timeSpentLastTick[obj.id()].ms) === 'number') {
					timingString += ' | LastTick: ' + ige._timeSpentLastTick[obj.id()].ms;
				}

				if (typeof(ige._timeSpentLastTick[obj.id()].depthSortChildren) === 'number') {
					timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[obj.id()].depthSortChildren;
				}
			}

			console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView + ' Timing(' + timingString + ')');
		} else {
			console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView);
		}

		currentDepth++;

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene._shouldRender) {
						if (igeConfig.debug._timing) {
							timingString = '';

							timingString += 'T: ' + ige._timeSpentInTick[arr[arrCount].id()];
							if (ige._timeSpentLastTick[arr[arrCount].id()]) {
								if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].ms) === 'number') {
									timingString += ' | LastTick: ' + ige._timeSpentLastTick[arr[arrCount].id()].ms;
								}

								if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren) === 'number') {
									timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren;
								}
							}

							console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView + ' Timing(' + timingString + ')');
						} else {
							console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView);
						}
						this.sceneGraph(arr[arrCount]._scene, currentDepth + 1);
					}
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.sceneGraph(arr[arrCount], currentDepth);
				}
			}
		}
	},

	/**
	 * Walks the scenegraph and returns a data object of the graph.
	 */
	getSceneGraphData: function (obj, noRef) {
		var item, items = [], tempItem, tempItem2, tempItems,
			arr, arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		item = {
			text: obj.id() + ' (' + obj._classId + ')',
			id: obj.id(),
			classId: obj.classId()
		};

		if (!noRef) {
			item.parent = obj._parent;
			item.obj = obj;
		} else {
			if (obj._parent) {
				item.parentId = obj._parent.id();
			} else {
				item.parentId = 'sceneGraph';
			}
		}

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = {
						text: arr[arrCount].id() + ' (' + arr[arrCount]._classId + ')',
						id: arr[arrCount].id(),
						classId: arr[arrCount].classId()
					};

					if (!noRef) {
						tempItem.parent = arr[arrCount]._parent;
						tempItem.obj = arr[arrCount];
					} else {
						if (arr[arrCount]._parent) {
							tempItem.parentId = arr[arrCount]._parent.id();
						}
					}

					if (arr[arrCount]._scene) {
						tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
						tempItem.items = [tempItem2];
					}

					items.push(tempItem);
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = this.getSceneGraphData(arr[arrCount], noRef);
					items.push(tempItem);
				}
			}
		}

		if (items.length > 0) {
			item.items = items;
		}

		return item;
	},

	destroy: function () {
		// Stop the engine and kill any timers
		this.stop();

		// Remove the front buffer (canvas) if we created it
		if (!this.isServer) {
			this.removeCanvas();
		}

		// Call class destroy() super method
		CLASSNAME.prototype._editNAME_.call(this);

		this.log('Engine destroy complete.');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEngine; };;var ClientNetworkEvents = {
	example: function (data) {}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientNetworkEvents; };var Rotator = IgeEntity.extend({
	classId:'Rotator',

	init: function (speed) {
		CLASSNAME.prototype._editNAME_.call(this);

		if (speed !== undefined) {
			this._rSpeed = speed;
		} else {
			this._rSpeed = 0;
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Rotate this entity by 0.1 degrees.
		this.rotateBy(0, 0, (this._rSpeed * ige._tickDelta) * Math.PI / 180);

		// Call the IgeEntity (super-class) tick() method
		CLASSNAME.prototype._editNAME_.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; };var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		var self = this;
		ige.showStats(1);
		ige.input.debug(true);

		// Load our textures
		self.obj = [];

		// Load the fairy texture and store it in the gameTexture object
		self.gameTexture = {};
		self.gameTexture.fairy = new IgeTexture('./assets/textures/sprites/fairy.png');

		// Load a smart texture
		self.gameTexture.simpleBox = new IgeTexture('./assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create an entity and mount it to the scene
					self.obj[0] = new Rotator(0.1)
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(self.gameTexture.fairy)
						.translateTo(0, 0, 0)
						.mount(self.scene1);

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new Rotator(0.1)
						.id('fairy2')
						.depth(1)
						.width(50)
						.height(50)
						.texture(self.gameTexture.fairy)
						.translateTo(0, 50, 0)
						.mount(self.obj[0]);

					// Create a third rotator entity and mount
					// it to the first on at 0, -50 relative to the
					// parent, but assign it a smart texture!
					self.obj[2] = new Rotator(0.1)
						.id('simpleBox')
						.depth(1)
						.width(50)
						.height(50)
						.texture(self.gameTexture.simpleBox)
						.translateTo(0, -50, 0)
						.mount(self.obj[0]);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; };var Game = IgeClass.extend({
	classId: 'Game',

	init: function (App, options) {
		// Create the engine
		ige = new IgeEngine();

		if (!ige.isServer) {
			ige.client = new App();
		}

		if (ige.isServer) {
			ige.server = new App(options);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Game; } else { var game = new Game(Client); };