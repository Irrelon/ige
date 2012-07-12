var IgeObject = IgeEventingClass.extend({
	classId: 'IgeObject',

	init: function () {
		this._parent = null;
		this._children = [];
		this._behaviours = [];
		this._depth = 0;
		this.data = {};
	},

	/**
	 * Handles screen resize events.
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
	_processBehaviours: function () {
		if (ige._frameAlternator !== this._behaviourFA) {
			var arr = this._behaviours,
				arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].method(this);
			}

			this._behaviourFA = ige._frameAlternator;
		}
	},

	/**
	 * Adds a behaviour to the object's active behaviour list.
	 * @param {String} id
	 * @param {Function} behaviour
	 * @return {Boolean} Returns true if the behaviour was added successfully, false on failure.
	 */
	addBehavior: function (id, behaviour) {
		if (behaviour !== undefined) {
			this._behaviours.push({
				id:id,
				method: behaviour
			});

			return true;
		}

		return false;
	},

	/**
	 * Removes a behaviour to the object's active behaviour list by it's id.
	 * @param {String} id
	 * @return {Boolean} Returns true if the behaviour was removed successfully, false on failure.
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
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Mounts this object to the passed object in the scenegraph.
	 * @param obj
	 * @return {Boolean}
	 */
	mount: function (obj) {
		if (this._parent) {
			if (this._parent === obj) {
				return false;
			} else {
				this.unMount();
			}
		}

		if (obj._children) {
			this._parent = obj;
			obj._children.push(this);

			return true;
		} else {
			return false;
		}
	},

	/**
	 * Unmounts this object from it's parent object in the scenegraph.
	 * @return {Boolean}
	 */
	unMount: function () {
		if (this._parent) {
			var childArr = this._parent._children,
				index = childArr.indexOf(this);

			if (index > -1) {
				childArr.splice(index, 1);
				this._parent = null;

				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},

	/**
	 * Clones the object and all it's children and returns a new object.
	 */
	clone: function () {
		// Loop all children and clone them, then return cloned version of ourselves
	},

	/**
	 * Gets / sets the indestructible flag. If set to true, the object will
	 * not be destroyed even if a call to the destroy() method is made.
	 * @param val
	 * @return {Boolean}
	 */
	indestructible: function (val) {
		if (typeof(val) !== 'undefined') {
			this._indestructible = val;
		}

		return this._indestructible;
	},

	depth: function (val) {
		if (val !== undefined) {
			this._depth = val;
		}

		return this._depth;
	},

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren: function () {
		// Now sort the entities by depth
		this._children.sort(function (a, b) {
			//if (!a._ignoreAABB && a._aabbDirty) { a.aabb(true); }
			//if (!b._ignoreAABB && b._aabbDirty) { b.aabb(true); }

			var layerIndex = b._layer - a._layer;

			if (layerIndex === 0) {
				// On same layer so sort by depth
				return b._depth - a._depth;
			} else {
				// Not on same layer so sort by layer
				return layerIndex;
			}
		});
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function () {
		// Depth sort all child objects
		this.depthSortChildren();

		// Process the current engine tick for all child objects
		var arr = this._children,
			arrCount = arr.length,
			ctx = ige._ctx;

		// Loop our children and call their tick methods
		while (arrCount--) {
			ctx.save();
				arr[arrCount].tick();
			ctx.restore();
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeObject; }