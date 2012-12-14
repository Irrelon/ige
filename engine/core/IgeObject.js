/**
 * Creates a new object.
 */
var IgeObject = IgeEventingClass.extend({
	classId: 'IgeObject',

	init: function () {
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

			// Now register this object with the category it has been assigned
			ige.categoryRegister(this);
			return this;
		}

		return this._category;
	},

	/**
	 * A warning method to help developers move to the new groups system.
	 */
	group: function () {
		this.log('The group() method has been renamed to category(). Please update your code.', 'error');
	},

	/**
	 * Adds this entity to a group or groups passed as
	 * arguments.
	 * @param {String} groupName A group to add the entity to.
	 * This method accepts multiple arguments, each is a group
	 * name to add the entity to.
	 * @example Add Entity To a Single Group
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1');
	 * @example Add Entity To Multiple Groups
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g2', 'g3');
	 * @return {*}
	 */
	addGroup: function () {
		var arrCount = arguments.length,
			groupName;

		while (arrCount--) {
			groupName = arguments[arrCount];

			if (!this._groups || this._groups.indexOf(groupName) === -1) {
				this._groups = this._groups || [];
				this._groups.push(groupName);

				// Now register this object with the group it has been assigned
				ige.groupRegister(this, groupName);
			}
		}

		return this;
	},

	/**
	 * Checks if the entity is in the specified group or
	 * groups. This method accepts multiple arguments, each
	 * of which is a group name. If multiple group names
	 * are passed, the method will only return true if the
	 * entity is in ALL the passed groups.
	 * @param {String} groupName The name of the group to
	 * check to see if this entity is a member of.
	 * @example Check if Entity Belongs To All Of The Passed Groups
	 * // Add a couple of groups
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g2');
	 *
	 * // This will output "false" (entity is not part of g3)
	 * console.log(entity.inGroup('g1', 'g3'));
	 *
	 * // This will output "true"
	 * console.log(entity.inGroup('g1'));
	 *
	 * // This will output "true"
	 * console.log(entity.inGroup('g1', 'g2'));
	 * @return {Boolean}
	 */
	inGroup: function () {
		var arrCount = arguments.length,
			groupName;

		while (arrCount--) {
			groupName = arguments[arrCount];

			if (groupName !== undefined) {
				if (!this._groups || this._groups.indexOf(groupName) === -1) {
					return false;
				}
			}
		}

		return true;
	},

	/**
	 * Checks if the entity is in the specified group or
	 * groups. This method accepts multiple arguments, each
	 * of which is a group name. If multiple group names
	 * are passed, the method will return true if the entity
	 * is in ANY of the the passed groups.
	 * @param {String} groupName The name of the group to
	 * check to see if this entity is a member of.
	 * @example Check if Entity Belongs To Any Of The Passed Groups
	 * // Add a couple of groups
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g2');
	 *
	 * // This will output "false"
	 * console.log(entity.inAnyGroup('g3'));
	 *
	 * // This will output "true"
	 * console.log(entity.inAnyGroup('g3', 'g1'));
	 * @return {Boolean}
	 */
	inAnyGroup: function () {
		var arrCount = arguments.length,
			groupName;

		while (arrCount--) {
			groupName = arguments[arrCount];

			if (groupName !== undefined) {
				if (this._groups && this._groups.indexOf(groupName) !== -1) {
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Gets an array of all groups this entity belongs to.
	 * @example Get Array of Groups Entity Belongs To
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g3');
	 *
	 * // This will output "['g1', 'g3']"
	 * console.log(entity.groups());
	 * @return {*}
	 */
	groups: function () {
		return this._groups || [];
	},

	/**
	 * Gets the number of groups this entity belongs to.
	 * @example Get Number of Groups Entity Belongs To
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g3');
	 *
	 * // This will output "2"
	 * console.log(entity.groupCount());
	 * @return {Number}
	 */
	groupCount: function () {
		return this._groups ? this._groups.length : 0;
	},

	/**
	 * Removes the entity from the group or groups passed. This
	 * method accepts multiple arguments and will remove the entity
	 * from all groups passed as arguments.
	 * @param {String} groupName The name of the group to remove
	 * this entity as a member of.
	 * @example Remove Entity From Single Group
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g3');
	 *
	 * // This will output "['g1', 'g3']"
	 * console.log(entity.groups());
	 *
	 * // Remove entity from a single group
	 * entity.removeGroup('g1');
	 *
	 * // This will output "['g3']"
	 * console.log(entity.groups());
	 * @example Remove Entity From Multiple Groups
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g3', 'g2');
	 *
	 * // This will output "['g1', 'g3', 'g2']"
	 * console.log(entity.groups());
	 *
	 * // Remove entity from multiple groups
	 * entity.removeGroup('g1', 'g3');
	 *
	 * // This will output "['g2']"
	 * console.log(entity.groups());
	 * @return {*}
	 */
	removeGroup: function () {
		if (this._groups) {
			var arrCount = arguments.length,
				groupName;

			while (arrCount--) {
				groupName = arguments[arrCount];
				this._groups.pull(groupName);

				// Now un-register this object with the group it has been assigned
				ige.groupUnRegister(this, groupName);
			}
		}

		return this;
	},

	/**
	 * Removes the entity from all groups it is a member of.
	 * @example
	 * var entity = new IgeEntity();
	 * entity.addGroup('g1', 'g3', 'g2');
	 *
	 * // This will output "['g1', 'g3', 'g2']"
	 * console.log(entity.groups());
	 *
	 * // Remove all the groups
	 * entity.removeAllGroups();
	 *
	 * // This will output "[]"
	 * console.log(entity.groups());
	 * @return {*}
	 */
	removeAllGroups: function () {
		// Loop through all groups and un-register one at a time
		var arr = this._groups,
			arrCount = arr.length;

		while (arrCount--) {
			ige.groupUnRegister(this, arr[arrCount]);
		}

		delete this._groups;
		return this;
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
				this._behaviours = this._behaviours || [];
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
				arrCount;

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
	 * by calling each child's destroy() method then deletes the reference
	 * to the object's internale _children array.
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
		delete this._behaviours;
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
	 * @example Turn off all depth sorting for this object's children
	 * entity.depthSortMode(-1);
	 * @example Use 3d bounds when sorting this object's children
	 * entity.depthSortMode(0);
	 * @example Use 3d bounds optimised for mostly cube-shaped bounds when sorting this object's children
	 * entity.depthSortMode(1);
	 * @example Use 3d bounds optimised for all cube-shaped bounds when sorting this object's children
	 * entity.depthSortMode(2);
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
	 * When view checking is enabled, this method is called to
	 * determine if this object is within the bounds of an active
	 * viewport, essentially determining if the object is
	 * "on screen" or not.
	 */
	viewCheckChildren: function () {
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
					if (vpViewArea.rectIntersect(item.aabb())) {
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
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx) {
		var arr = this._children,
			arrCount,
			arrIndex,
			ts, td,
			depthSortTime,
			tickTime,
			ac1, ac2;

		if (this._viewChecking) {
			// Set the in-scene flag for each child based on
			// the current viewport
			this.viewCheckChildren();
		}

		if (arr) {
			arrCount = arr.length;
			ac1 = arrCount;
			// Depth sort all child objects
			if (arrCount && !ige._headless) {
				if (igeDebug._timing) {
					if (!ige._tslt[this.id()]) {
						ige._tslt[this.id()] = {};
					}

					ts = new Date().getTime();
					this.depthSortChildren();
					td = new Date().getTime() - ts;
					ige._tslt[this.id()].depthSortChildren = td;
				} else {
					this.depthSortChildren();
				}
			}
			ac2 = arrCount;
			// Loop our children and call their tick methods
			if (igeDebug._timing) {
				while (arrCount--) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige._tsit[arr[arrCount].id()]) {
							ige._tsit[arr[arrCount].id()] = 0;
						}

						if (!ige._tslt[arr[arrCount].id()]) {
							ige._tslt[arr[arrCount].id()] = {};
						}

						ige._tsit[arr[arrCount].id()] += td;
						ige._tslt[arr[arrCount].id()].tick = td;
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
	_processBehaviours: function (ctx) {
		var arr = this._behaviours,
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeObject; }