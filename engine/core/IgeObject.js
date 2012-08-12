var IgeObject = IgeEventingClass.extend({
	classId: 'IgeObject',

	init: function () {
		this._mode = 0;
		this._mountMode = 0;
		this._parent = null;
		this._children = [];
		this._behaviours = [];
		this._layer = 0;
		this._depth = 0;
		this._dirty = true;
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
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = ige.newIdHex();
			ige.register(this);
		}

		return this._id;
	},

	/**
	 * Gets / sets the arbitrary group name that the object belongs to.
	 * @param {String=} val
	 * @return {*}
	 */
	group: function (val) {
		if (val !== undefined) {
			this._group = val;
			return this;
		}

		return this._group;
	},

	/**
	 * Adds a behaviour to the object's active behaviour list.
	 * @param {String} id
	 * @param {Function} behaviour
	 * @return {*} Returns this on success or false on failure.
	 */
	addBehaviour: function (id, behaviour) {
		if (typeof(id) === 'string') {
			if (typeof(behaviour) === 'function') {
				this._behaviours.push({
					id:id,
					method: behaviour
				});

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
	 * @return {*} Returns this on success or false on failure.
	 */
	removeBehaviour: function (id) {
		if (id !== undefined) {
			// Find the behaviour
			var arr = this._behaviours,
				arrCount = arr.length;

			while (arrCount--) {
				if (arr[arrCount].id === id) {
					// Remove the item from the array
					arr.splice(arrCount, 1);
					return this;
				}
			}
		}

		return false;
	},

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's bounds drawn when the bounds for all objects are being drawn.
	 * @param {Boolean} val
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
	 * @param val
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
	 * @return {*}
	 */
	parent: function () {
		return this._parent;
	},

	/**
	 * Returns the object's children as an array of objects.
	 * @return {Array}
	 */
	children: function () {
		return this._children;
	},

	/**
	 * Mounts this object to the passed object in the scenegraph.
	 * @param {IgeObject} obj
	 * @return {*} Returns this on success or false on failure.
	 */
	mount: function (obj) {
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
			obj._children.push(this);

			this._parent._childMounted(this);

			return this;
		} else {
			// The object has no _children array!
			return false;
		}
	},

	/**
	 * Unmounts this object from it's parent object in the scenegraph.
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
	 * Clones the object and all it's children and returns a new object.
	 */
		// TODO: Write this function!
	clone: function () {
		// Loop all children and clone them, then return cloned version of ourselves
	},

	/**
	 * Gets / sets the positioning mode of the entity.
	 * @param val 0 = 2d, 1 = isometric
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
	 * Gets / sets the current entity layer.
	 * @param {Number=} val
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
	 * are drawn over lower depths).
	 * @param {Number=} val
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
	 * by calling each child's destroy() method.
	 */
	destroyChildren: function () {
		var arr = this._children,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount].destroy();
		}
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
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren: function () {
		// TODO: Optimise this method, it is not especially efficient at the moment!
		if (this._mountMode === 1) {
			// Calculate depths from 3d bounds
			var arr = this._children,
				arrCount = arr.length,
				sortObj = {
					adj: [],
					c: [],
					p: [],
					order: [],
					order_ind: arrCount - 1
				},
				i, j;

			if (arrCount > 1) {
				for (i = 0; i < arrCount; ++i) {
					sortObj.c[i] = 0;
					sortObj.p[i] = -1;

					for (j = i + 1; j < arrCount; ++j) {
						sortObj.adj[i] = sortObj.adj[i] || [];
						sortObj.adj[j] = sortObj.adj[j] || [];

						if (arr[i]._projectionOverlap(arr[j])) {
							if (arr[i]._isBehind(arr[j])) {
								sortObj.adj[j].push(i);
							} else {
								sortObj.adj[i].push(j);
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
			}

			// Now sort the entities by depth
			this._children.sort(function (a, b) {
				var layerIndex = b._layer - a._layer;

				if (layerIndex === 0) {
					// On same layer so sort by depth
					/*if (a._projectionOverlap(b)) {
						if (a._isBehind(b)) {
							return -1;
						} else {
							return 1;
						}
					}*/
					return b._depth - a._depth;
				} else {
					// Not on same layer so sort by layer
					return layerIndex;
				}
			});
		} else {
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
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, scene) {
		// Depth sort all child objects
		this.depthSortChildren();

		if (!scene) {
			// Process the current engine tick for all child objects
			var arr = this._children,
				arrCount = arr.length;

			// Loop our children and call their tick methods
			while (arrCount--) {
				ctx.save();
					arr[arrCount].tick(ctx);
				ctx.restore();
			}
		} else {
			// Get the index of the object to tick
			var arrIndex = this._children.indexOf(scene);
			if (arrIndex > -1) {
				this._children[arrIndex].tick(ctx);
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
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	},

	/**
	 * Calls each behaviour method for the object.
	 * @private
	 */
	_processBehaviours: function (ctx) {
		if (ige._frameAlternator !== this._behaviourFA) {
			var arr = this._behaviours,
				arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].method.apply(this, arguments);
			}

			this._behaviourFA = ige._frameAlternator;
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
		var arr,
			arrCount;

		// Remove ourselves from any parent
		this.unMount();

		// Remove any children
		if (this._children) {
			this.destroyChildren();
		}

		// Remove the object from the lookup system
		ige.unRegister(this);

		// Remove the children array severing any references
		// to any child objects so that the GC can pick them up
		delete this._children;

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
					case '_group':
						str += ".group('" + this.group() + "')";
						break;
					case '_drawBounds':
						str += ".drawBounds('" + this.drawBounds() + "')";
						break;
					case '_drawBoundsData':
						str += ".drawBoundsData('" + this.drawBoundsData() + "')";
						break;
					case '_drawMouse':
						str += ".drawMouse('" + this.drawMouse() + "')";
						break;
					case '_mode':
						str += ".mode('" + this.mode() + "')";
						break;
					case '_isometricMounts':
						str += ".isometricMounts('" + this.isometricMounts() + "')";
						break;
					case '_indestructible':
						str += ".indestructible('" + this.indestructible() + "')";
						break;
					case '_layer':
						str += ".layer('" + this.layer() + "')";
						break;
					case '_depth':
						str += ".depth('" + this.depth() + "')";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeObject; }