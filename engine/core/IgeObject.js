/**
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

				if (obj.updateTransform) {
					obj.updateTransform();
					obj.aabb(true);
				}
				
				if (obj._compositeCache) {
					this._compositeParent = true;
				} else {
					delete this._compositeParent;
				}

				this.emit('mounted', this._parent);

				return this;
			} else {
				// The object has no _children array!
				this.log('Cannot mount object because it has no _children array!', 'warning');
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
	 * Clones the object and all it's children and returns a new object.
	 */
	clone: function (options) {
		// Make sure we have an options object
		if (options === undefined) { options = {}; }
		
		// Set some default option values
		if (options.id === undefined) { options.id = false; }
		if (options.mount === undefined) { options.mount = false; }
		if (options.transform === undefined) { options.transform = true; }
		
		// Loop all children and clone them, then return cloned version of ourselves
		var newObject = eval(this.stringify(options));
		
		return newObject;
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
	 * by calling each child's destroy() method then clears the object's
	 * internal _children array.
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

		this._children = [];

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
	stringify: function (options) {
		// Make sure we have an options object
		if (options === undefined) { options = {}; }
		
		var str = "new " + this.classId() + "()";

		// Every object has an ID, assign that first
		if (options.id !== false) {
			str += ".id('" + this.id() + "')";
		}

		// Now check if there is a parent and mount that
		if (options.mount !== false && this.parent()) {
			str += ".mount(ige.$('" + this.parent().id() + "'))";
		}

		// Now get all other properties
		str += this._stringify(options);

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
	_stringify: function (options) {
		// Make sure we have an options object
		if (options === undefined) { options = {}; }
		
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