import IgeEventingClass from "./IgeEventingClass";
import igeConfig from "./config.js";
import IgeEntity from "./IgeEntity";
import Ige from "./Ige";

/**
 * Creates a new object.
 */
class IgeObject extends IgeEventingClass {
	classId = "IgeObject";
	_ige: Ige;
	_id?: string;
	_didInit = false;
	_newBorn = true;
	_alive = true;
	_mode = 0;
	_mountMode = 0;
	_parent: IgeObject | null = null;
	_children: (IgeObject | IgeEntity)[] = [];
	_layer = 0;
	_depth = 0;
	_depthSortMode = 0;
	_timeStream = [];
	_inView = true;
	_managed = 1;
	_drawBounds: boolean = false;
	_drawBoundsData: boolean = false;
	_drawMouse: boolean = false;
	_drawMouseData: boolean = false;
	_ignoreCamera: boolean = false;
	_streamRoomId?: string;
	_compositeCache: boolean = false;
	_compositeParent: boolean = false;
	_sortChildren: (comparatorFunction: (a: any, b: any) => number) => void;

	constructor (ige: Ige) {
		super(ige);
		this._ige = ige;

		// Default sorting behavior
		this._sortChildren = (compareFn) => {
			return this._children.sort(compareFn);
		};
	}

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
	alive (val?: boolean) {
		if (val !== undefined) {
			this._alive = val;
			return this;
		}

		return this._alive;
	}

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
	id (id?: string) {
		if (id !== undefined) {
			// Check if we're changing the id
			if (id !== this._id) {
				// Check if this ID already exists in the object register
				if (this._ige._register[id]) {
					// Already an object with this ID!
					if (this._ige._register[id] !== this) {
						this.log("Cannot set ID of object to \"" + id + "\" because that ID is already in use by another object!", "error");
					}
				} else {
					// Check if we already have an id assigned
					if (this._id && this._ige._register[this._id]) {
						// Unregister the old ID before setting this new one
						this._ige.unRegister(this);
					}

					this._id = id;

					// Now register this object with the object register
					this._ige.register(this);

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
			this._id = this._ige.newIdHex();
			this._ige.register(this);
		}

		return this._id;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its bounds drawn when the bounds for all objects are being drawn.
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
	drawBounds (val?: boolean) {
		if (val !== undefined) {
			this._drawBounds = val;
			return this;
		}

		return this._drawBounds;
	}

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
	drawBoundsData (val?: boolean) {
		if (val !== undefined) {
			this._drawBoundsData = val;
			return this;
		}

		return this._drawBoundsData;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's mouse position drawn, usually for debug purposes.
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
	drawMouse (val?: boolean) {
		if (val !== undefined) {
			this._drawMouse = val;
			return this;
		}

		return this._drawMouse;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * it's extra mouse data drawn for debug purposes. For instance, on tilemaps
	 * (IgeTileMap2d) instances, when enabled you will see the tile x and y
	 * co-ordinates currently being hoverered over by the mouse.
	 * @param {Boolean=} val
	 * @example #Enable draw mouse data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouseData(true);
	 * @example #Disable draw mouse data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouseData(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawMouseData());
	 * @return {*}
	 */
	drawMouseData (val?: boolean) {
		if (val !== undefined) {
			this._drawMouseData = val;
			return this;
		}

		return this._drawMouseData;
	}

	/**
	 * Returns the object's parent object (the object that
	 * it is mounted to).
	 * @param {String=} id Optional, if present will scan up
	 * the parent chain until a parent with the matching id is
	 * found. If none is found, returns undefined.
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
	parent (id?: string): IgeObject | null {
		if (!id) {
			return this._parent;
		}

		if (this._parent) {
			if (this._parent.id() === id) {
				return this._parent;
			} else {
				return this._parent.parent(id);
			}
		}

		return null;
	}

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
	children () {
		return this._children;
	}

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
	mount (obj?: IgeObject) {
		if (obj) {
			if (obj === this) {
				this.log("Cannot mount an object to itself!", "error");
				return this;
			}

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

				// Check if we need to set the "ignore camera" flag
				if (!this._ignoreCamera && this._parent._ignoreCamera) {
					this._ignoreCamera = this._parent._ignoreCamera;

					/*if (this.ignoreCameraComposite) {
						this.ignoreCameraComposite(this._parent._ignoreCamera);
					}*/
				}

				// Make sure we keep the child's room id in sync with its parent
				if (this._parent._streamRoomId) {
					this._streamRoomId = this._parent._streamRoomId;
				}

				obj._children.push(this);
				this._parent._childMounted(this);

				if (obj.updateTransform) {
					obj.updateTransform();
					obj.aabb(true);
				}

				if (obj._compositeCache) {
					this._compositeCache = true;
				} else {
					this._compositeParent = false;
				}

				this._mounted(this._parent);

				this.emit("mounted", this._parent);

				return this;
			} else {
				// The object has no _children array!
				this.log("Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have extended from IgeEntity.", "warning");
				return false;
			}
		} else {
			this.log("Cannot mount non-existent object!", "error");
		}
	}

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
	unMount () {
		if (this._parent) {
			var childArr = this._parent._children,
				index = childArr.indexOf(this),
				oldParent = this._parent;

			if (index > -1) {
				// Found this in the parent._children array so remove it
				childArr.splice(index, 1);

				this._parent._childUnMounted(this);
				this._parent = null;

				this._unMounted(oldParent);

				return this;
			} else {
				// Cannot find this in the parent._children array
				return false;
			}
		} else {
			return false;
		}
	}

	/**
	 * Determines if the object has a parent up the scenegraph whose
	 * id matches the one passed. Will traverse each parent object
	 * checking if the id matches. This information will be cached when
	 * first called and can be refreshed by setting the "fresh" parameter
	 * to true.
	 * @param {String} parentId The id of the parent to check for.
	 * @param {Boolean=} fresh If true will force a full check instead of
	 * using the cached value from an earlier check.
	 */
	hasParent (parentId, fresh) {
		var bool = false;

		// Check for a cached value
		if (!fresh && this._hasParent && this._hasParent[parentId] !== undefined) {
			return this._hasParent[parentId];
		}

		if (this._parent) {
			if (this._parent.id() === parentId) {
				bool = true;
			} else {
				bool = this._parent.hasParent(parentId, fresh);
			}
		}

		this._hasParent = this._hasParent || {};
		this._hasParent[parentId] = bool;

		return bool;
	}

	/**
	 * Clones the object and all it's children and returns a new object.
	 */
	clone (options) {
		// Make sure we have an options object
		if (options === undefined) { options = {}; }

		// Set some default option values
		if (options.id === undefined) { options.id = false; }
		if (options.mount === undefined) { options.mount = false; }
		if (options.transform === undefined) { options.transform = true; }

		// Loop all children and clone them, then return cloned version of ourselves
		var newObject = eval(this.stringify(options));

		return newObject;
	}

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
	indestructible (val) {
		if (typeof(val) !== "undefined") {
			this._indestructible = val;
			return this;
		}

		return this._indestructible;
	}

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
	layer (val) {
		if (val !== undefined) {
			this._layer = val;
			return this;
		}

		return this._layer;
	}

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
	depth (val) {
		if (val !== undefined) {
			this._depth = val;
			return this;
		}

		return this._depth;
	}

	/**
	 * Loops through all child objects of this object and destroys them
	 * by calling each child's destroy() method then clears the object's
	 * internal _children array.
	 */
	destroyChildren () {
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].destroy();
			}
		}

		this._children = [];

		return this;
	}

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
	isometric (val) {
		if (val === true) {
			this._mode = 1;
			return this;
		}

		if (val === false) {
			this._mode = 0;
			return this;
		}

		return this._mode === 1;
	}

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
	isometricMounts (val) {
		if (val === true) {
			this._mountMode = 1;
			return this;
		}

		if (val === false) {
			this._mountMode = 0;
			return this;
		}

		return this._mountMode === 1;
	}

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
	depthSortMode (val) {
		if (val !== undefined) {
			this._depthSortMode = val;
			return this;
		}

		return this._depthSortMode;
	}

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren () {
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
								"adj": [],
								"c": [],
								"p": [],
								"order": [],
								"order_ind": arrCount - 1
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

							this._sortChildren((a, b) => {
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
							this._sortChildren((a, b) => {
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
							this._sortChildren((a, b) => {
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
						this._sortChildren((a, b) => {
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
	}

	update (ctx, tickDelta) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		if (this._newBorn) { this._newBorn = false; }

		var arr = this._children,
			arrCount,
			ts, td;

		if (!arr) {
			return;
		}

		arrCount = arr.length;

		// Depth sort all child objects
		if (arrCount && !this._ige._headless) {
			if (igeConfig.debug._timing) {
				if (!this._ige._timeSpentLastTick[this.id()]) {
					this._ige._timeSpentLastTick[this.id()] = {};
				}

				ts = new Date().getTime();
				this.depthSortChildren();
				td = new Date().getTime() - ts;
				this._ige._timeSpentLastTick[this.id()].depthSortChildren = td;
			} else {
				this.depthSortChildren();
			}
		}

		// Loop our children and call their update methods
		if (igeConfig.debug._timing) {
			while (arrCount--) {
				ts = new Date().getTime();
				arr[arrCount].update(ctx, tickDelta);
				td = new Date().getTime() - ts;
				if (arr[arrCount]) {
					if (!this._ige._timeSpentInTick[arr[arrCount].id()]) {
						this._ige._timeSpentInTick[arr[arrCount].id()] = 0;
					}

					if (!this._ige._timeSpentLastTick[arr[arrCount].id()]) {
						this._ige._timeSpentLastTick[arr[arrCount].id()] = {};
					}

					this._ige._timeSpentInTick[arr[arrCount].id()] += td;
					this._ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
				}
			}
		} else {
			while (arrCount--) {
				arr[arrCount].update(ctx, tickDelta);
			}
		}
	}

	/**
	 * Processes the actions required each render frame.
	 */
	tick (ctx) {
		// Check that we are alive before processing further
		if (!this._alive) { return; }

		let arr = this._children,
			arrCount,
			ts, td;

		if (!arr) { return; }

		arrCount = arr.length;

		if (igeConfig.debug._timing) {
			while (arrCount--) {
				if (!arr[arrCount]) {
					this.log("Object _children is undefined for index " + arrCount + " and _id: " + this._id, "error");
					continue;
				}

				if (!arr[arrCount]._newBorn) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!this._ige._timeSpentInTick[arr[arrCount].id()]) {
							this._ige._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!this._ige._timeSpentLastTick[arr[arrCount].id()]) {
							this._ige._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						this._ige._timeSpentInTick[arr[arrCount].id()] += td;
						this._ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
					}
					ctx.restore();
				}
			}
		} else {
			while (arrCount--) {
				if (!arr[arrCount]) {
					this.log("Object _children is undefined for index " + arrCount + " and _id: " + this._id, "error");
					continue;
				}

				if (!arr[arrCount]._newBorn) {
					ctx.save();
					arr[arrCount].tick(ctx);
					ctx.restore();
				}
			}
		}
	}

	_depthSortVisit (u, sortObj) {
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
	}

	/**
	 * Handles screen resize events. Calls the _resizeEvent method of
	 * every child object mounted to this object.
	 * @param event
	 * @private
	 */
	_resizeEvent = (event) => {
		var arr = this._children,
			arrCount;

		if (!arr) { return; }

		arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}


	}

	/**
	 * Called when a child object is mounted to this object.
	 * @param obj
	 * @private
	 */
	_childMounted (obj) {
		this._resizeEvent(null);
	}

	/**
	 * Called when a child object is un-mounted to this object.
	 * @param obj
	 * @private
	 */
	_childUnMounted (obj) {}

	/**
	 * Called when this object is mounted to another object.
	 * @param obj
	 * @private
	 */
	_mounted (obj) {

	}

	/**
	 * Called when this object is un-mounted from it's parent.
	 * @param obj
	 * @private
	 */
	_unMounted (obj) {

	}

	isMounted () {
		return Boolean(this._parent);
	}

	/**
	 * Destroys the object and all it's child objects, removing them from the
	 * scenegraph and from memory.
	 */
	destroy () {
		// Remove ourselves from any parent
		this.unMount();

		// Remove any children
		if (this._children) {
			this.destroyChildren();
		}

		// Remove the object from the lookup system
		this._ige.unRegister(this);

		// Set a flag in case a reference to this object
		// has been held somewhere, shows that the object
		// should no longer be interacted with
		this._alive = false;

		// Remove the event listeners array in case any
		// object references still exist there
		delete this._eventListeners;

		return this;
	}

	/**
	 * Gets or sets the function used to sort children for example in depth sorting. This allows us to optionally use
	 * a stable sort (for browsers where the native implementation is not stable) or something more specific such as
	 * insertion sort for a speedup when we know data is going to be already mostly sorted.
	 * @param {Function=} val Sorting function - must operate on this._children and sort the array in place.
	 * @example #Set the child sorting algorithm
	 *     var entity = new IgeEntity();
	 *     entity.childSortingAlgorithm(function (compareFn) { this._children.sort(compareFn); });
	 * @return {*}
	 */
	childSortingAlgorithm (val) {
		if (val !== undefined) {
			this._sortChildren = val;
			return this;
		}

		return this._sortChildren;
	}

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
	addBehaviour (id: string, behaviour: (...args: any[]) => any, duringTick = false) {
		if (typeof(id) === "string") {
			if (typeof(behaviour) === "function") {
				if (duringTick) {
					this._tickBehaviours = this._tickBehaviours || [];
					this._tickBehaviours.push({
						id,
						"method": behaviour
					});
				} else {
					this._updateBehaviours = this._updateBehaviours || [];
					this._updateBehaviours.push({
						id,
						"method": behaviour
					});
				}

				return this;
			} else {
				this.log("The behaviour you passed is not a function! The second parameter of the call must be a function!", "error");
			}
		} else {
			this.log("Cannot add behaviour to object because the specified behaviour id is not a string. You must provide two parameters with the addBehaviour() call, an id:String and a behaviour:Function. Adding a behaviour with an id allows you to remove it by it's id at a later stage!", "error");
		}

		return false;
	}

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
	removeBehaviour (id, duringTick) {
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
	}

	/**
	 * Checks if the object has the specified behaviour already added to it.
	 * @param {String} id
	 * @param {Boolean=} duringTick If true will look to remove the behaviour
	 * from the tick method rather than the update method.
	 * @example #Check for a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *
	 *     // Now check for the "myBehaviour" behaviour
	 *     console.log(entity.hasBehaviour('myBehaviour')); // Will log "true"
	 * @return {*} Returns this on success or false on failure.
	 */
	hasBehaviour (id, duringTick) {
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
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Calls each behaviour method for the object.
	 * @private
	 */
	_processUpdateBehaviours (...args) {
		var arr = this._updateBehaviours,
			arrCount;

		if (arr) {
			arrCount = arr.length;
			while (arrCount--) {
				arr[arrCount].method(this._ige, this, ...args);
			}
		}
	}

	/**
	 * Calls each behaviour method for the object.
	 */
	_processTickBehaviours (...args) {
		var arr = this._tickBehaviours,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].method(this._ige, this, ...args);
			}
		}
	}
}

export default IgeObject;
