/**
 * The base class system.
 */
var IgeClass = (function () {
	var initializing = false,
		fnTest = /xyz/.test(function () {xyz;}) ? /\b_super\b/ : /.*/,

		// The base Class implementation (does nothing)
		IgeClass = function () {},
		// TODO: Add parameters to all the doc comments below.
		/**
		 * Provides logging capabilities to all IgeClass instances.
		 */
		log = function (text, type, obj) {
			var indent = '',
				stack;

			type = type || 'log';

			if (obj !== undefined) {
				console.warn(obj);
			}

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

			return this;
		},

		/**
		 * Gets / sets the class id. Primarily used to help identify
		 * what class an instance was instantiated with and is also
		 * output during the ige.scenegraph() method's console logging
		 * to show what class an object belogs to.
		 */
		classId = function (name) {
			if (typeof(name) !== 'undefined') {
				if (this._classId) {
					this._classId = name;
				} else {
					this.prototype._classId = name;
				}
				return this;
			}

			return (this._classId || this.prototype._classId);
		},

		/**
		 * Creates a new instance of the component argument passing
		 * the options argument to the component as it is initialised.
		 * The new component instance is then added to "this" via
		 * a property name that is defined in the component class as
		 * "componentId".
		 */
		addComponent = function (component, options) {
			var newComponent = new component(this, options);
			this[newComponent.componentId] = newComponent;
			return this;
		},

		/**
		 * Copies all properties and methods from the classObj object
		 * to "this". If the overwrite flag is not set or set to false,
		 * only properties and methods that don't already exists in
		 * "this" will be copied. If overwrite is true, they will be
		 * copied regardless.
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

	// Create a new IgeClass that inherits from this class
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

		// Add the implement method
		IgeClass.prototype.implement = implement;

		return IgeClass;
	};

	return IgeClass;
}());

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeClass; }