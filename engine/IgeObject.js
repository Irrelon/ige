var IgeObject = IgeEventingClass.extend({
	classId: 'IgeObject',

	init: function () {
		this._parent = null;
		this._children = [];
		this._behaviours = [];
		this._layer = 0;
		this._depth = 0;
		this._dirty = true;
		this._data = {};

		// Reference the main input system
		if (!this.input && ige && ige.input) {
			this.input = ige.input;
		}
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
				arr[arrCount].method(ctx, this);
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
	 * Gets / sets a key / value pair in the object's data object. Useful for
	 * storing arbitrary game data in the object.
	 * @param {String} key The key under which the data resides.
	 * @param {*=} value The data to set under the specified key.
	 * @return {*}
	 */
	data: function (key, value) {
		if (key !== undefined) {
			if (value !== undefined) {
				this._data[key] = value;

				return this;
			}

			return this._data[key];
		}
	},

	/**
	 * Gets / sets the arbitrary group name that the object belogs to.
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
	addBehavior: function (id, behaviour) {
		if (behaviour !== undefined) {
			this._behaviours.push({
				id:id,
				method: behaviour
			});

			return this;
		}

		return false;
	},

	/**
	 * Removes a behaviour to the object's active behaviour list by it's id.
	 * @param {String} id
	 * @return {*} Returns this on success or false on failure.
	 */
	removeBehavior: function (id) {
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
	 * Mounts this object to the passed object in the scenegraph.
	 * @param {IgeObject} obj
	 * @return {*} Returns this on success or false on failure.
	 */
	mount: function (obj) {
		if (obj._children) {
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

	_visit: function (u, sortObj) {
		var arr = sortObj.adj[u],
			arrCount = arr.length,
			i, v;

		sortObj.c[u] = 1;

		for (i = 0; i < arrCount; ++i) {
			v = arr[i];

			if (sortObj.c[v] === 0) {
				sortObj.p[v] = u;
				this._visit(v, sortObj);
			}
		}

		sortObj.c[u] = 2;
		sortObj.order[sortObj.order_ind] = u;
		--sortObj.order_ind;
	},

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren: function () {
		// TODO: Optimise this method, it is not especially efficient at the moment!
		if (this._mode === 1) {
			// Now sort the entities by depth
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
						this._visit(i, sortObj);
					}
				}

				for (i = 0; i < sortObj.order.length; i++) {
					arr[sortObj.order[i]].depth(i);
				}
			}

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
			arr = this._children;
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].destroy();
			}
		}

		// Remove the children array severing any references
		// to any child objects so that the GC can pick them up
		delete this._children;

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeObject; }