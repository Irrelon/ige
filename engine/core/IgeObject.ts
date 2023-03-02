/**
 * Creates a new object.
 */
import { IgeEventingClass } from "./IgeEventingClass";
import { BehaviourDefinition } from "../../types/BehaviourDefinition";
import { IgeEntity } from "./IgeEntity";
import { IgeClassProps } from "./IgeClass";

export class IgeObject extends IgeEventingClass {
    _classId = "IgeObject";
    _category: string;
    _newBorn: boolean;
    _alive: boolean;
    _mode: number;
    _mountMode: number;
    _parent: IgeObject | IgeEntity | null;
    _children: (IgeObject | IgeEntity)[] = [];
    _compositeParent: boolean;
    _hasParent: Record<string, boolean>;
    _indestructible: boolean;
    _layer: number;
    _depth: number;
    _depthSortMode: number;
    _timeStream: never[];
    _inView: boolean;
    _managed: number;
    _specialProp: string[];
    _groups: string[];
    _tickBehaviours: BehaviourDefinition[];
    _updateBehaviours: BehaviourDefinition[];
    _drawBounds: boolean;
    _drawBoundsData: boolean;
    _drawMouse: boolean;
    _drawMouseData: boolean;
    _ignoreCamera: boolean;
    _streamRoomId: string;
    _viewChecking: boolean;
    _sortChildren: (compareFunc: (a, b) => number) => void;

    constructor({ ige, igeConfig }: IgeClassProps) {
        super({ ige, igeConfig });
        this._newBorn = true;
        this._alive = true;
        this._mode = 0;
        this._mountMode = 0;
        this._parent = null;
        this._children = [];
        this._layer = 0;
        this._depth = 0;
        this._depthSortMode = 0;
        this._timeStream = [];
        this._inView = true;
        this._managed = 1;

        this._specialProp = ["_id", "_parent", "_children"];

        // Default sorting behavior
        this._sortChildren = function (compareFn) {
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
    alive(val) {
        if (val !== undefined) {
            this._alive = val;
            return this;
        }

        return this._alive;
    }

    /**
     * Gets / set the managed mode from 0 to 2. 0 = off, 1 = static, 2 = dynamic.
     *
     * @param {Number=} val Set to 0 to switch off managed mode, 1 to set to static
     * managed mode or 2 to dynamic managed mode. When in a managed mode and when
     * the parent of this entity has an entity manager component enabled, the entity
     * will be checked to see if it is inside the visible area of a viewport. If it
     * is deemed not to be in a visible area (via it's AABB non-intersection with
     * viewport view area) then it will either be un-mounted from the parent (mode 1)
     * or marked as no longer in view (mode 2). Mode 2 in view = false will cause the
     * entity to no longer be depth-sorted or rendered but will still have it's
     * update() method called each frame allowing logic processing to occur as normal.
     * The default managed mode is 1.
     * @returns {*}
     */
    managed(val) {
        if (val !== undefined) {
            this._managed = val;
            return this;
        }

        return this._managed;
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
    id(id?) {
        if (id !== undefined) {
            // Check if we're changing the id
            if (id !== this._id) {
                // Check if this ID already exists in the object register
                if (this._ige._register[id]) {
                    // Already an object with this ID!
                    if (this._ige._register[id] !== this) {
                        this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', "error");
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
     *     var entityArray = this._ige.$$('categoryName');
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
    category(val?: string) {
        if (val === undefined) {
            return this._category;
        }

        // Check if we already have a category
        if (this._category) {
            // Check if the category being assigned is different from
            // the current one
            if (this._category !== val) {
                // The category is different so remove this object
                // from the current category association
                this._ige.categoryUnRegister(this);
            }
        }

        this._category = val;

        // Check the category is not a blank string
        if (val) {
            // Now register this object with the category it has been assigned
            this._ige.categoryRegister(this);
        }
        return this;
    }

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
    addGroup() {
        let arrCount = arguments.length;
        let groupName;
        let groupItemCount;

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
                        this._ige.groupRegister(this, groupName[groupItemCount]);
                    }
                }
            } else {
                if (!this._groups || this._groups.indexOf(groupName) === -1) {
                    this._groups = this._groups || [];
                    this._groups.push(groupName);

                    // Now register this object with the group it has been assigned
                    this._ige.groupRegister(this, groupName);
                }
            }
        }

        return this;
    }

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
    inGroup(groupName?: string, matchAllGroups = false) {
        if (!groupName) return false;

        if (matchAllGroups) {
            return this.inAllGroups(groupName);
        } else {
            return this.inAnyGroup(groupName);
        }
    }

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
    inAllGroups(groupName) {
        let arrItem, arrCount;

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
    }

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
    inAnyGroup(groupName) {
        let arrItem, arrCount;

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
            return this._groups && this._groups.indexOf(groupName) > -1;
        }

        return false;
    }

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
    groups() {
        return this._groups || [];
    }

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
    groupCount(): number {
        return this._groups ? this._groups.length : 0;
    }

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
    removeGroup() {
        if (this._groups) {
            let arrCount = arguments.length,
                groupName,
                groupNameCount;

            while (arrCount--) {
                groupName = arguments[arrCount];

                if (groupName instanceof Array) {
                    groupNameCount = groupName.length;

                    while (groupNameCount--) {
                        this._groups.pull(groupName[groupNameCount]);

                        // Now un-register this object with the group it has been assigned
                        this._ige.groupUnRegister(this, groupName[groupNameCount]);
                    }
                } else {
                    this._groups.pull(groupName);

                    // Now un-register this object with the group it has been assigned
                    this._ige.groupUnRegister(this, groupName);
                }
            }
        }

        return this;
    }

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
    removeAllGroups() {
        if (this._groups) {
            // Loop through all groups and un-register one at a time
            const arr = this._groups;
            let arrCount = arr.length;

            while (arrCount--) {
                this._ige.groupUnRegister(this, arr[arrCount]);
            }

            delete this._groups;
        }
        return this;
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
    addBehaviour(id: string, behaviour, duringTick) {
        if (typeof id === "string") {
            if (typeof behaviour === "function") {
                if (duringTick) {
                    this._tickBehaviours = this._tickBehaviours || [];
                    this._tickBehaviours.push({
                        id: id,
                        method: behaviour
                    });
                } else {
                    this._updateBehaviours = this._updateBehaviours || [];
                    this._updateBehaviours.push({
                        id: id,
                        method: behaviour
                    });
                }

                return this;
            } else {
                this.log("The behaviour you passed is not a function! The second parameter of the call must be a function!", "error");
            }
        } else {
            this.log(
                "Cannot add behaviour to object because the specified behaviour id is not a string. You must provide two parameters with the addBehaviour() call, an id:String and a behaviour:Function. Adding a behaviour with an id allows you to remove it by it's id at a later stage!",
                "error"
            );
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
    removeBehaviour(id, duringTick) {
        if (id !== undefined) {
            let arr, arrCount;

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
    hasBehaviour(id, duringTick) {
        if (id !== undefined) {
            let arr, arrCount;

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
    drawBounds(val) {
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
    drawBoundsData(val) {
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
    drawMouse(val) {
        if (val !== undefined) {
            this._drawMouse = val;
            return this;
        }

        return this._drawMouse;
    }

    /**
     * Gets / sets the boolean flag determining if this object should have
     * its extra mouse data drawn for debug purposes. For instance, on tilemaps
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
    drawMouseData(val) {
        if (val !== undefined) {
            this._drawMouseData = val;
            return this;
        }

        return this._drawMouseData;
    }

    /**
     * Finds a child entity that matches the id mounted to this
     * or any other child entity down the scenegraph chain. Will
     * only return an object if the entity found has this entity
     * as an ancestor (parent or parent of parent etc).
     * @param {String} id The id of the entity to find.
     * @returns {*} The entity or undefined.
     */
    $(id: string) {
        const obj = this._ige.$(id);

        if (obj._parent === this) {
            // We found a child and its parent is this object so return it
            return obj;
        } else {
            // Scan up the object's parent chain to see if this object is
            // an ancestor at some point
            const ancestor = obj.parent(this.id());

            if (ancestor) {
                return obj;
            } else {
                return undefined;
            }
        }
    }

    /**
     * Finds all child entities of this or any child of this entity
     * down the scenegraph whose category matches the category name
     * passed.
     * @param {String} categoryName The category name to scan for.
     * @returns {Array}
     */
    $$(categoryName) {
        let objArr = this._ige.$$(categoryName),
            arrCount = objArr.length,
            obj,
            finalArr = [],
            thisId = this.id();

        // Scan all objects that have the specified category
        // and see if we are it's parent or an ancestor
        while (arrCount--) {
            obj = objArr[arrCount];
            if (obj._parent === this || obj.parent(thisId)) {
                finalArr.push(obj);
            }
        }

        return finalArr;
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
    parent(id) {
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

        return undefined;
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
    children() {
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
    mount(obj: IgeObject | IgeEntity) {
        if (!obj) {
            this.log("Cannot mount non-existent object!", "error");
            return;
        }
        if (obj === this) {
            this.log("Cannot mount an object to itself!", "error");
            return this;
        }

        if (!obj._children) {
            // The object has no _children array!
            this.log(
                "Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have called the prototype.init() method of your super-class during the init of your custom class.",
                "warning"
            );
            return false;
        }

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

        // Check if we need to set the ignore camera flag
        if (!this._ignoreCamera && this._parent._ignoreCamera) {
            this._ignoreCamera = this._parent._ignoreCamera;

            /*if (this.ignoreCameraComposite) {
				this.ignoreCameraComposite(this._parent._ignoreCamera);
			}*/
        }

        // Make sure we keep the child's room id in sync with it's parent
        if (this._parent._streamRoomId) {
            this._streamRoomId = this._parent._streamRoomId;
        }

        obj._children.push(this);
        this._parent._childMounted(this);

        if ("updateTransform" in obj && obj.updateTransform) {
            obj.updateTransform();
            obj.aabb(true);
        }

        if ("_compositeCache" in obj && obj._compositeCache) {
            this._compositeParent = true;
        } else {
            delete this._compositeParent;
        }

        this._mounted(this._parent);

        this.emit("mounted", this._parent);

        return this;
    }

    /**
     * Unmounts this object from its parent object in the scenegraph.
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
    unMount() {
        if (!this._parent) {
            return false;
        }

        const childArr = this._parent._children;
        const index = childArr.indexOf(this);
        const oldParent = this._parent;

        if (index === -1) {
            // Cannot find this in the parent._children array
            return false;
        }

        // Found this in the parent._children array so remove it
        childArr.splice(index, 1);

        this._parent._childUnMounted(this);
        this._parent = null;

        this._unMounted(oldParent);

        return this;
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
    hasParent(parentId: string, fresh = false) {
        let bool = false;

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
    clone(options) {
        // Make sure we have an options object
        if (options === undefined) {
            options = {};
        }

        // Set some default option values
        if (options.id === undefined) {
            options.id = false;
        }

        if (options.mount === undefined) {
            options.mount = false;
        }

        if (options.transform === undefined) {
            options.transform = true;
        }

        // Loop all children and clone them, then return cloned version of ourselves
        return eval(this.stringify(options));
    }

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
    mode(val?) {
        if (val === undefined) {
            return this._mode;
        }

        this._mode = val;
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
    isometric(val?: boolean) {
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
    isometricMounts(val?: boolean) {
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
    indestructible(val?: boolean) {
        if (typeof val !== "undefined") {
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
    layer(val?: number) {
        if (val === undefined) {
            return this._layer;
        }

        this._layer = val;
        return this;
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
    depth(val?: number) {
        if (val === undefined) {
            return this._depth;
        }

        this._depth = val;
        return this;
    }

    /**
     * Loops through all child objects of this object and destroys them
     * by calling each child's destroy() method then clears the object's
     * internal _children array.
     */
    destroyChildren() {
        const arr = this._children;
        let arrCount;

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
     * Removes all references to any behaviour methods that were added to
     * this object.
     */
    destroyBehaviours() {
        delete this._updateBehaviours;
        delete this._tickBehaviours;
    }

    /**
     * Loops through all components added to this object and calls their
     * destroy() method, then removes any references to the components.
     * @return {*}
     */
    destroyComponents() {
        let arr = this._components,
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
    depthSortMode(val) {
        if (val === undefined) {
            return this._depthSortMode;
        }

        this._depthSortMode = val;
        return this;
    }

    /**
     * Sorts the _children array by the layer and then depth of each object.
     */
    depthSortChildren() {
        if (this._depthSortMode === -1) {
            return;
        }

        let arr = this._children,
            arrCount,
            sortObj,
            i,
            j;

        if (!arr) {
            return;
        }

        arrCount = arr.length;

        if (arrCount <= 1) {
            return;
        }

        if (this._mountMode === 1) {
            // Check the depth sort mode
            if (this._depthSortMode === 0) {
                // Slowest, uses 3d bounds
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

                this._sortChildren(function (a, b) {
                    const layerIndex = b._layer - a._layer;

                    if (layerIndex === 0) {
                        // On same layer so sort by depth
                        return b._depth - a._depth;
                    }

                    // Not on same layer so sort by layer
                    return layerIndex;
                });
            }

            if (this._depthSortMode === 1) {
                // Medium speed, optimised for almost-cube shaped 3d bounds
                // Now sort the entities by depth
                this._sortChildren(function (a, b) {
                    const layerIndex = b._layer - a._layer;

                    if (layerIndex !== 0) {
                        // Not on same layer so sort by layer
                        return layerIndex;
                    }

                    // On same layer so sort by depth
                    //if (a._projectionOverlap(b)) {
                    if (a.isBehind(b)) {
                        return -1;
                    } else {
                        return 1;
                    }
                    //}
                });
            }

            if (this._depthSortMode === 2) {
                // Fastest, optimised for cube-shaped 3d bounds
                while (arrCount--) {
                    sortObj = arr[arrCount];
                    j = sortObj._translate;

                    if (j) {
                        sortObj._depth = j.x + j.y + j.z;
                    }
                }

                // Now sort the entities by depth
                this._sortChildren(function (a, b) {
                    const layerIndex = b._layer - a._layer;

                    if (layerIndex === 0) {
                        // On same layer so sort by depth
                        return b._depth - a._depth;
                    } else {
                        // Not on same layer so sort by layer
                        return layerIndex;
                    }
                });
            }
        } else {
            // 2d mode
            // Now sort the entities by depth
            this._sortChildren(function (a, b) {
                const layerIndex = b._layer - a._layer;

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

    /**
     * Gets / sets the view checking flag that if set to true
     * will ask the engine to check during each tick if this
     * object is actually "on screen" or not, and bypass it
     * if it is not. The default is this flag set to false.
     * @param {Boolean=} val The boolean flag value.
     * @return {*}
     */
    viewChecking(val) {
        if (val !== undefined) {
            this._viewChecking = val;
            return this;
        }

        return this._viewChecking;
    }

    /**
     * ALPHA CODE DO NOT USE YET.
     * When view checking is enabled, this method is called to
     * determine if this object is within the bounds of an active
     * viewport, essentially determining if the object is
     * "on screen" or not.
     */
    viewCheckChildren() {
        if (!this._ige._currentViewport) return this;

        let arr = this._children,
            arrCount = arr.length,
            vpViewArea = this._ige._currentViewport.viewArea(),
            item;

        while (arrCount--) {
            item = arr[arrCount];

            if (item._alwaysInView) {
                item._inView = true;
            } else {
                if (item.aabb) {
                    // Check the entity to see if its bounds are "inside" the
                    // viewport's visible area
                    if (vpViewArea.intersects(item.aabb(true))) {
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

        return this;
    }

    update(ctx, tickDelta) {
        // Check that we are alive before processing further
        if (this._alive) {
            if (this._newBorn) {
                this._newBorn = false;
            }

            const arr = this._children;
            let arrCount;
            let ts, td;

            if (arr) {
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
        }
    }

    /**
     * Processes the actions required each render frame.
     */
    tick(ctx) {
        // Check that we are alive before processing further
        if (this._alive) {
            let arr = this._children,
                arrCount,
                ts,
                td;

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
        }
    }

    _depthSortVisit(u, sortObj) {
        let arr = sortObj.adj[u],
            arrCount = arr.length,
            i,
            v;

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
    _resizeEvent(event) {
        let arr = this._children,
            arrCount;

        if (arr) {
            arrCount = arr.length;

            while (arrCount--) {
                arr[arrCount]._resizeEvent(event);
            }
        }
    }

    /**
     * Calls each behaviour method for the object.
     * @private
     */
    _processUpdateBehaviours(ctx: CanvasRenderingContext2D, tickDelta?: number) {
        const arr = this._updateBehaviours;

        if (arr) {
            let arrCount = arr.length;
            while (arrCount--) {
                arr[arrCount].method.apply(this, arguments);
            }
        }
    }

    /**
     * Calls each behaviour method for the object.
     * @private
     */
    _processTickBehaviours(ctx: CanvasRenderingContext2D) {
        const arr = this._tickBehaviours;

        if (arr) {
            let arrCount = arr.length;
            while (arrCount--) {
                arr[arrCount].method.apply(this, arguments);
            }
        }
    }

    /**
     * Called when a child object is mounted to this object.
     * @param obj
     * @private
     */
    _childMounted(obj) {
        this._resizeEvent(null);
    }

    /**
     * Called when a child object is un-mounted to this object.
     * @param obj
     * @private
     */
    _childUnMounted(obj) {}

    /**
     * Called when this object is mounted to another object.
     * @param obj
     * @private
     */
    _mounted(obj) {}

    /**
     * Called when this object is un-mounted from it's parent.
     * @param obj
     * @private
     */
    _unMounted(obj) {}

    /**
     * Destroys the object and all it's child objects, removing them from the
     * scenegraph and from memory.
     */
    destroy() {
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
        this._ige.unRegister(this);
        this._ige.categoryUnRegister(this);
        this._ige.groupUnRegister(this);

        // Set a flag in case a reference to this object
        // has been held somewhere, shows that the object
        // should no longer be interacted with
        this._alive = false;

        // Remove the event listeners array in case any
        // object references still exist there
        delete this._eventListeners;

        return this;
    }

    objSave() {
        return { igeClass: this.classId(), data: this._objSaveReassign(this, []) };
    }

    objLoad(obj) {
        this._objLoadReassign(this, obj.data);
    }

    saveSpecialProp(obj, i) {
        switch (i) {
            case "_id":
                if (obj._id) {
                    return { _id: obj._id };
                }
                break;

            case "_parent":
                if (obj._parent) {
                    return { _parent: obj._parent.id() };
                }
                break;

            case "_children":
                if (obj._children.length) {
                    let childIndex,
                        child,
                        arr = [];

                    for (childIndex = 0; childIndex < obj._children.length; childIndex++) {
                        child = obj._children[childIndex];
                        arr.push(child.objSave());
                    }

                    return { _children: arr };
                }
                break;
        }

        return undefined;
    }

    loadSpecialProp(obj, i) {
        switch (i) {
            case "_id":
                return { _id: obj[i] };
                break;

            case "_parent":
                return { _parent: obj[i] };
                break;

            case "_children":
                return { _children: obj[i] };
                break;
        }
        return undefined;
    }

    loadGraph(obj) {
        if (obj.igeClass && obj.data) {
            // Create a new class instance
            let classInstance = this._ige.newClassInstance(obj.igeClass),
                newId,
                childArr,
                childIndex,
                parentId;

            classInstance.objLoad(obj);

            if (classInstance._parent) {
                // Record the id and delete it
                parentId = classInstance._parent;
                delete classInstance._parent;
            }

            // Process item id
            if (classInstance._id) {
                newId = classInstance._id;
                delete classInstance._id;

                classInstance.id(newId);
            }

            // Check for children and process them if exists
            if (classInstance._children && classInstance._children.length) {
                childArr = classInstance._children;
                classInstance._children = [];

                for (childIndex = 0; childIndex < childArr.length; childIndex++) {
                    classInstance.loadGraph(childArr[childIndex]);
                }
            }

            // Now mount the instance if it has a parent
            classInstance.mount(this);
        }
    }

    _objSaveReassign(obj, ref) {
        let copyObj,
            specialKeys = this._specialProp,
            refIndex,
            specProp,
            specPropKey,
            i;

        if (typeof obj === "object" && !(obj instanceof Array)) {
            copyObj = {};

            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (typeof obj[i] === "object") {
                        if (specialKeys.indexOf(i) === -1) {
                            // Check if the ref already exists
                            refIndex = ref.indexOf(obj[i]);

                            if (refIndex > -1) {
                                copyObj[i] = "{ref:" + refIndex + "}";
                                this.log("Possible circular reference for property " + i);
                            } else {
                                ref.push(obj[i]);
                                copyObj[i] = this._objSaveReassign(obj[i], ref);
                            }
                        } else {
                            // This is a special property that needs handling via
                            // it's own method to return an appropriate data value
                            // so check if there is a method for it
                            specProp = this.saveSpecialProp(obj, i);

                            if (specProp) {
                                if (typeof specProp === "object" && !(specProp instanceof Array)) {
                                    // Process the returned object properties
                                    for (specPropKey in specProp) {
                                        if (specProp.hasOwnProperty(specPropKey)) {
                                            // Copy the special property data to the key in
                                            // our return object
                                            copyObj[specPropKey] = specProp[specPropKey];
                                        }
                                    }
                                } else {
                                    copyObj[i] = specProp;
                                }
                            }
                        }
                    } else {
                        copyObj[i] = obj[i];
                    }
                }
            }

            return copyObj;
        } else {
            return obj;
        }
    }

    _objLoadReassign(obj, newProps) {
        let specialKeys = this._specialProp,
            specProp,
            specPropKey,
            i;

        for (i in newProps) {
            if (newProps.hasOwnProperty(i)) {
                if (specialKeys.indexOf(i) === -1) {
                    if (typeof newProps[i] === "object" && obj[i]) {
                        this._objLoadReassign(obj[i], newProps[i]);
                    } else {
                        // Assign the property value directly
                        obj[i] = newProps[i];
                    }
                } else {
                    // This is a special property that needs handling via
                    // it's own method to return an appropriate data value
                    // so check if there is a method for it
                    specProp = this.loadSpecialProp(newProps, i);

                    if (specProp) {
                        if (typeof specProp === "object" && !(specProp instanceof Array)) {
                            // Process the returned object properties
                            for (specPropKey in specProp) {
                                if (specProp.hasOwnProperty(specPropKey)) {
                                    // Copy the special property data to the key in
                                    // our return object
                                    obj[specPropKey] = specProp[specPropKey];
                                }
                            }
                        } else {
                            obj[i] = specProp;
                        }
                    }
                }
            }
        }
    }

    /**
     * Gets or sets the function used to sort children for example in depth sorting. This allows us to optionally use
     * a stable sort (for browsers where the native implementation is not stable) or something more specific such as
     * insertion sort for a speedup when we know data is going to be already mostly sorted.
     * @param {Function=} val Sorting function - must operate on this._children and sort the array in place.
     * @example #Set the child sorting algorthm
     *     var entity = new IgeEntity();
     *     entity.childSortingAlgorithm(function (compareFn) { this._children.sort(compareFn); });
     * @return {*}
     */
    childSortingAlgorithm(val) {
        if (val !== undefined) {
            this._sortChildren = val;
            return this;
        }

        return this._sortChildren;
    }

    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {String}
     */
    stringify(options) {
        // Make sure we have an options object
        if (options === undefined) {
            options = {};
        }

        let str = "new " + this.classId() + "()";

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
    }

    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String}
     */
    _stringify(options) {
        // Make sure we have an options object
        if (options === undefined) {
            options = {};
        }

        let str = "",
            i;

        // Loop properties and add property assignment code to string
        for (i in this) {
            if (this.hasOwnProperty(i) && this[i] !== undefined) {
                switch (i) {
                    case "_category":
                        str += ".category(" + this.category() + ")";
                        break;
                    case "_drawBounds":
                        str += ".drawBounds(" + this.drawBounds() + ")";
                        break;
                    case "_drawBoundsData":
                        str += ".drawBoundsData(" + this.drawBoundsData() + ")";
                        break;
                    case "_drawMouse":
                        str += ".drawMouse(" + this.drawMouse() + ")";
                        break;
                    case "_mode":
                        str += ".mode(" + this.mode() + ")";
                        break;
                    case "_isometricMounts":
                        str += ".isometricMounts(" + this.isometricMounts() + ")";
                        break;
                    case "_indestructible":
                        str += ".indestructible(" + this.indestructible() + ")";
                        break;
                    case "_layer":
                        str += ".layer(" + this.layer() + ")";
                        break;
                    case "_depth":
                        str += ".depth(" + this.depth() + ")";
                        break;
                }
            }
        }

        return str;
    }
}
