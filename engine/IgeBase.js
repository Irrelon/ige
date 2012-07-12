ige = null;
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

/** Array.prototype.pull - Removes the passed item from
an array. {
	category:"method",
	arguments:[{
		name:"item",
		type:"multi",
		desc:"The item to be removed from the array."
	}],
	returns: {
		type:"integer",
		desc:"Returns the index of the removed item or -1 if the item could not be found in the array.",
	},
} **/
Array.prototype.pull = function (item) {
	var index = this.indexOf(item);
	if (index > -1) {
		this.splice(index, 1);
		return index;
	} else {
		return -1;
	}
};

/** disableContextMenu - Turn off the right-click default behaviour in the
browser for the passed element. {
	category:"method",
	arguments:[{
		name:"obj",
		type:"object",
		desc:"The element name to disable right-click context menus for.",
	}],
} **/
var disableContextMenu = function (obj) {
	if (obj !== null) {
		//this.log('Disabling context menus for ' + obj, 'info');
		obj.oncontextmenu = function () { return false; };
	}
};

/** Array.prototype.indexOf - Adds the indexOf method to all
array objects if it does not already exist which would you
believe can still happen. {
	category:"method",
} **/
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

/** window.requestAnimFrame - A cross-browser requestAnimFrame method. {
	category:"method",
} **/
if (typeof(window) !== 'undefined') {
	/*window.requestAnimFrame = (function(){
		return function(callback, element){
			setTimeout(callback, 1000 / 1);
		};
	}());
	*/
	requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame     ||
		function(callback, element){
			setTimeout(callback, 1000 / 60);
		};
	}());
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