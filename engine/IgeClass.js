/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
var IgeClass = (function () {
	var initializing = false,
		fnTest = /xyz/.test(function () {xyz;}) ? /\b_super\b/ : /.*/,

		// The base Class implementation (does nothing)
		IgeClass = function () {},

		log = function (text, type, obj) {
			var indent = '',
				i,
				stack;
			if (!igeDebug.trace.indentLevel) { igeDebug.trace.indentLevel = 0; }

			for (i = 0; i < igeDebug.trace.indentLevel; i++) {
				indent += '  ';
			}

			type = type || 'log';

			if (type === 'error') {
				if (igeDebug.stacks) {
					if (igeDebug.node) {
						stack = new Error().stack;
						//console.log(color.magenta('Stack:'), color.red(stack));
						console.log('Stack:', stack);
					} else {
						if (typeof(printStackTrace) === 'function') {
							console.log('Stack:', printStackTrace().join('\n ---- '));
						}
					}
				}

				if (igeDebug.throwErrors) {
					throw(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
				} else {
					console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
				}
			} else {
				console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
			}
		},

		classId = function (name) {
			if (typeof(name) !== 'undefined') {
				if (this._classId) {
					this._classId = name;
				} else {
					this.prototype._classId = name;
				}
			}

			return (this._classId || this.prototype._classId);
		},

		addComponent = function (component, options) {
			var newComponent = new component(this, options);
			this[newComponent.componentId] = newComponent;
		},

		implement = function (classObj) {
			var i, obj = classObj.prototype || classObj;

			// Copy the class object's properties to (this)
			for (i in obj) {
				// Only copy the property if this doesn't already have it
				if (obj.hasOwnProperty(i) && this[i] === undefined) {
					this[i] = obj[i];
				}
			}
		};

	// Create a new IgeClass that inherits from this class
	IgeClass.extend = function (prop) {
		var _super = this.prototype,
			name,
			prototype;

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
				// super-class method via this._super() in the
				// new method
				prototype[name] = (function (name, fn) {
					return function () {
						var tmp = this._super,
							ret;

						// Add a new ._super() method that is the same method
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

		// The dummy class constructor
		function IgeClass() {
			if (!initializing && this.init) {
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

		// Add class name capability
		IgeClass.prototype.classId = classId;
		IgeClass.prototype._classId = prop.classId || 'IgeClass';

		// Add the addComponent method
		IgeClass.prototype.addComponent = addComponent;

		// Add the implement method
		IgeClass.prototype.implement = implement;

		return IgeClass;
	};

	return IgeClass;
}());

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeClass; }