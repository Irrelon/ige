import { ige } from "../instance";
import IgeBaseClass from "./IgeBaseClass";
import IgePoint2d from "./IgePoint2d";
import IgePoint3d from "./IgePoint3d";
import IgeMatrix2d from "./IgeMatrix2d";
import IgePoly2d from "./IgePoly2d";
import IgeDummyCanvas from "./IgeDummyCanvas";
import IgeRect from "./IgeRect";
import IgeDummyContext from "./IgeDummyContext";
import WithEventingMixin from "../mixins/IgeEventingMixin";
import WithDataMixin from "../mixins/IgeDataMixin";
import { arrPull, degreesToRadians, newIdHex, toIso } from "../services/utils";

import IgeNetIoComponent from "engine/components/network/net.io/IgeNetIoComponent";
import { IgePoint } from "../../types/IgePoint";
import { IgeRegisterableById } from "../../types/IgeRegisterableById";
import type { IgeDepthSortObject } from "../../types/IgeDepthSortObject";
import type { IgeSmartTexture } from "../../types/IgeSmartTexture";
import type { IgeTimeStreamPacket, IgeTimeStreamParsedTransformData } from "../../types/IgeTimeStream";
import type IgeViewport from "./IgeViewport";
import type IgeTexture from "./IgeTexture";
import type IgeTileMap2d from "./IgeTileMap2d";
import type { IgeRegisterableByCategory } from "../../types/IgeRegisterableByCategory";
import type { IgeRegisterableByGroup } from "../../types/IgeRegisterableByGroup";

export interface IgeEntityBehaviour {
    id: string;
    method: (...args: any[]) => any;
}

/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
 */
class IgeEntity extends WithEventingMixin(WithDataMixin(IgeBaseClass)) implements IgeRegisterableById, IgeRegisterableByCategory, IgeRegisterableByGroup {
	classId = "IgeEntity";
	_idRegistered: boolean = false;
	_categoryRegistered: boolean = false;
	_entity?: IgeEntity; // TODO: This may not be required? Where does it get set from? Could be removed and all relevant code looking at it.
	_id?: string;
	_didInit = false;
	_newBorn = true;
	_alive = true;
	_mode = 0;
	_mountMode = 0;
	_parent: IgeEntity | IgeTileMap2d | null = null;
	_children: IgeEntity[] = [];
	_layer = 0;
	_depth = 0;
	_depthSortMode = 0;
	_category?: string;
	_timeStream: IgeTimeStreamPacket[] = [];
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
	_anchor: IgePoint2d;
	_renderPos: { x: number; y: number };
	_computedOpacity: number;
	_opacity: number;
	_cell: number | null = 1;
	_deathTime?: number;
	_bornTime: number = 0;
	_translate: IgePoint3d;
	_oldTranslate: IgePoint3d;
	_rotate: IgePoint3d;
	_scale: IgePoint3d;
	_origin: IgePoint3d;
	_bounds2d: IgePoint2d;
	_oldBounds2d: IgePoint2d;
	_bounds3d: IgePoint3d;
	_oldBounds3d: IgePoint3d;
	_highlight: boolean;
	_mouseEventsActive: boolean;
	_velocity: IgePoint3d;
	_localMatrix: IgeMatrix2d;
	_worldMatrix: IgeMatrix2d;
	_oldWorldMatrix: IgeMatrix2d;
	_adjustmentMatrix?: IgeMatrix2d;
	_hidden: boolean;
	_cache: boolean = false;
	_cacheCtx?: CanvasRenderingContext2D | typeof IgeDummyContext | null;
	_cacheCanvas?: HTMLCanvasElement | IgeDummyCanvas;
	_cacheDirty: boolean = false;
	_cacheSmoothing: boolean = false;
	_aabbDirty: boolean = false;
	_aabb?: IgeRect;
	_hasParent?: Record<string, boolean>;
	_texture?: IgeTexture;
	_streamMode?: number;
	_streamDataCache?: boolean;
	_indestructible: boolean = false;
	_shouldRender?: boolean = true;
	_noAabb?: boolean;
	_smartBackground?: IgeSmartTexture;
	_lastUpdate?: number;
	_timeStreamCurrentInterpolateTime?: number;
	_timeStreamDataDelta?: number;
	_timeStreamOffsetDelta?: number;
	_timeStreamPreviousData?: IgeTimeStreamPacket;
	_timeStreamNextData?: IgeTimeStreamPacket;
	_tickBehaviours?: IgeEntityBehaviour[];
	_updateBehaviours?: IgeEntityBehaviour[];
	_birthMount?: string;
	_frameAlternatorCurrent: boolean = false;
	_backgroundPattern?: IgeTexture;
	_backgroundPatternRepeat?: string;
	_backgroundPatternTrackCamera?: boolean;
	_backgroundPatternIsoTile?: boolean;
	_backgroundPatternFill?: CanvasPattern | null;
	_tileWidth?: number;
	_tileHeight?: number;
	_deathCallBack?: (...args: any[]) => void; // TODO: Rename this to _deathCallback (lower case B)
	_sortChildren: (comparatorFunction: (a: IgeEntity, b: IgeEntity) => number) => void;

	constructor () {
		super();

		// Default sorting behavior
		this._sortChildren = (compareFn) => {
			return this._children.sort(compareFn);
		};

		this._anchor = new IgePoint2d(0, 0);
		this._renderPos = { x: 0, y: 0 };

		this._computedOpacity = 1;
		this._opacity = 1;
		this._cell = 1;

		this._deathTime = undefined;

		this._translate = new IgePoint3d(0, 0, 0);
		this._oldTranslate = new IgePoint3d(0, 0, 0);
		this._rotate = new IgePoint3d(0, 0, 0);
		this._scale = new IgePoint3d(1, 1, 1);
		this._origin = new IgePoint3d(0.5, 0.5, 0.5);

		this._bounds2d = new IgePoint2d(40, 40);
		this._bounds3d = new IgePoint3d(0, 0, 0);

		this._oldBounds2d = new IgePoint2d(40, 40);
		this._oldBounds3d = new IgePoint3d(0, 0, 0);

		this._highlight = false;
		this._mouseEventsActive = false;

		this._velocity = new IgePoint3d(0, 0, 0);

		this._localMatrix = new IgeMatrix2d();
		this._worldMatrix = new IgeMatrix2d();
		this._oldWorldMatrix = new IgeMatrix2d();

		this._inView = true;
		this._hidden = false;

		//this._mouseEventTrigger = 0;

		/* CEXCLUDE */
		if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
			// Set the stream floating point precision to 2 as default
			this.streamFloatPrecision(2);
		}
		/* CEXCLUDE */

		// Set the default stream sections as just the transform data
		this.streamSections(["transform"]);
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
	id(): string;
	id(id: string): this;
	id (id?: string): this | string | undefined {
		if (id === undefined) {
			return this._id;
		}

		// Check if we're changing the id
		if (id === this._id) {
			// The same ID we already have is being applied,
			// ignore the request and return
			return this;
		}

		// Check if this ID already exists in the object register
		if (!ige.register.get(id)) {
			// Check if we already have an id assigned
			if (this._id && ige.register.get(this._id)) {
				// Unregister the old ID before setting this new one
				ige.register.remove(this);
			}

			this._id = id;

			// Now register this object with the object register
			ige.register.add(this);

			return this;
		}

		// Already an object with this ID!
		if (ige.register.get(id) !== this) {
			this.log(`Cannot set ID of object to "${id}" because that ID is already in use by another object!`, "error");
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = newIdHex();
			ige.register.add(this);
		}
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
	category(): string | undefined;
	category(val: string): this;
	category (val?: string) {
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
				ige.categoryRegister.remove(this);
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
	drawBounds(): boolean;
	drawBounds(id: boolean): this;
	drawBounds (val?: boolean) {
		if (val !== undefined) {
			this._drawBounds = val;
			return this;
		}

		return this._drawBounds;
	}

	/**
     * Gets / sets the boolean flag determining if this object should have
     * its bounds data drawn when the bounds for all objects are being drawn.
     * Bounds data includes the object ID and its current depth etc.
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
	drawBoundsData(): boolean;
	drawBoundsData(val: boolean): this;
	drawBoundsData (val?: boolean) {
		if (val !== undefined) {
			this._drawBoundsData = val;
			return this;
		}

		return this._drawBoundsData;
	}

	/**
     * Gets / sets the boolean flag determining if this object should have
     * its mouse position drawn, usually for debug purposes.
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
	drawMouse(): boolean;
	drawMouse(val: boolean): this;
	drawMouse (val?: boolean) {
		if (val !== undefined) {
			this._drawMouse = val;
			return this;
		}

		return this._drawMouse;
	}

	/**
     * Gets / sets the boolean flag determining if this object should have
     * its extra mouse data drawn for debug purposes. For instance, on tile maps
     * (IgeTileMap2d) instances, when enabled you will see the tile x and y
     * co-ordinates currently being hovered over by the mouse.
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
	drawMouseData(): boolean;
	drawMouseData(val: boolean): this;
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
	parent(): IgeEntity | IgeTileMap2d | null | undefined;
	parent(id: string): IgeEntity | null;
	parent (id?: string): IgeEntity | IgeTileMap2d | null {
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
     *     // Get the children array entity1
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
     * @param {IgeEntity} obj
     * @example #Mount an entity to another entity
     *     // Create a couple of entities and give them ids
     *     var entity1 = new IgeEntity().id('entity1'),
     *         entity2 = new IgeEntity().id('entity2');
     *
     *     // Mount entity2 to entity1
     *     entity2.mount(entity1);
     * @return {*} Returns this on success or false on failure.
     */
	mount (obj: IgeEntity): this {
		if (obj === this) {
			this.log("Cannot mount an object to itself!", "error");
			return this;
		}

		if (!obj._children) {
			// The object has no _children array!
			throw new Error(
				"Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have extended from IgeEntity."
			);
		}

		// Check that the engine will allow us to register this object
		this.id(); // Generates a new id if none is currently set, and registers it on the object register!

		if (this._parent) {
			if (this._parent === obj) {
				// We are already mounted to the parent!
				return this;
			}

			// We are already mounted to a different parent
			this.unMount();
		}

		// Set our parent to the object we are mounting to
		this._parent = obj;

		// Check if we need to set the "ignore camera" flag
		this._ignoreCamera = this._parent._ignoreCamera;

		/*if (this.ignoreCameraComposite) {
            this.ignoreCameraComposite(this._parent._ignoreCamera);
        }*/

		// Make sure we keep the child's room id in sync with its parent
		if (this._parent._streamRoomId) {
			this._streamRoomId = this._parent._streamRoomId;
		}

		if (this._bornTime === 0) {
			this._bornTime = ige.engine._currentTime;
		}

		obj._children.push(this);
		this._parent._childMounted(this);

		obj.updateTransform();
		obj.aabb(true);

		if (obj._compositeCache) {
			this._compositeCache = true;
		} else {
			this._compositeParent = false;
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
	unMount () {
		if (!this._parent) {
			return false;
		}

		const childArr = this._parent._children,
			index = childArr.indexOf(this),
			oldParent = this._parent;

		if (index <= -1) {
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
	hasParent (parentId: string, fresh = false): boolean {
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
     * Clones the object and all its children and returns a new object.
     */
	clone (options?: Record<string, boolean>) {
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
     * Gets / sets the indestructible flag. If set to true, the object will
     * not be destroyed even if a call to destroy() method is made.
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
	indestructible(): boolean;
	indestructible(val: boolean): this;
	indestructible (val?: boolean): boolean | this {
		if (val !== undefined) {
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
     *     // because even though its depth is higher, it is not on the same
     *     // layer as entity 2 and 3.
     *
     *     // Based on the layers and depths we have assigned, here
     *     // is how the engine will sort the draw order of the entities
     *     // entity1
     *     // entity2
     *     // entity3
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
	layer(): number;
	layer(val: number): this;
	layer (val?: number): number | this {
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
     *     // because even though its depth is higher, it is not on the same
     *     // layer as entity 2 and 3.
     *
     *     // Based on the layers and depths we have assigned, here
     *     // is how the engine will sort the draw order of the entities
     *     // entity1
     *     // entity2
     *     // entity3
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
	depth(): number;
	depth(val: number): this;
	depth (val?: number) {
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
		const arr = this._children;

		if (arr) {
			let arrCount = arr.length;

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
	isometric(): boolean;
	isometric(val: boolean): this;
	isometric (val?: boolean): boolean | this {
		if (val !== undefined) {
			this._mode = val ? 1 : 0;
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
	isometricMounts(): boolean;
	isometricMounts(val: boolean): this;
	isometricMounts (val?: boolean) {
		if (val !== undefined) {
			this._mountMode = val ? 1 : 0;
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
	depthSortMode(): number;
	depthSortMode(val: number): this;
	depthSortMode (val?: number) {
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
		if (this._depthSortMode === -1) {
			return;
		}

		const arr = this._children;

		if (arr) {
			let arrCount = arr.length;

			// See if we can bug-out early (one or no children)
			if (arrCount <= 1) {
				return;
			}

			if (this._mountMode !== 1) {
				// 2d mode
				// Now sort the entities by depth
				this._sortChildren((a, b) => {
					const layerIndex = b._layer - a._layer;

					if (layerIndex === 0) {
						// On same layer so sort by depth
						return b._depth - a._depth;
					} else {
						// Not on same layer so sort by layer
						return layerIndex;
					}
				});

				return;
			}

			// Check the depth sort mode
			if (this._depthSortMode === 0) {
				// Slowest, uses 3d bounds
				// Calculate depths from 3d bounds
				const sortObj: IgeDepthSortObject = {
					adj: [],
					c: [],
					p: [],
					order: [],
					order_ind: arrCount - 1
				};

				for (let i = 0; i < arrCount; ++i) {
					sortObj.c[i] = 0;
					sortObj.p[i] = -1;

					for (let j = i + 1; j < arrCount; ++j) {
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

				for (let i = 0; i < arrCount; ++i) {
					if (sortObj.c[i] !== 0) {
						continue;
					}

					this._depthSortVisit(i, sortObj);
				}

				for (let i = 0; i < sortObj.order.length; i++) {
					arr[sortObj.order[i]].depth(i);
				}

				this._sortChildren((a, b) => {
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

			if (this._depthSortMode === 1) {
				// Medium speed, optimised for almost-cube shaped 3d bounds
				// Now sort the entities by depth
				this._sortChildren((a, b) => {
					const layerIndex = b._layer - a._layer;

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

			if (this._depthSortMode === 2) {
				// Fastest, optimised for cube-shaped 3d bounds
				while (arrCount--) {
					const sortObj = arr[arrCount];
					const j = sortObj._translate;

					if (!j) {
						continue;
					}

					sortObj._depth = j.x + j.y + j.z;
				}

				// Now sort the entities by depth
				this._sortChildren((a, b) => {
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
	}

	_update (ctx: CanvasRenderingContext2D, tickDelta: number) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		if (this._newBorn) {
			this._newBorn = false;
		}

		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		// Depth sort all child objects
		if (arrCount && !ige.engine._headless) {
			if (ige.config.debug._timing) {
				if (!ige.engine._timeSpentLastTick[this.id()]) {
					ige.engine._timeSpentLastTick[this.id()] = {};
				}

				const ts = new Date().getTime();
				this.depthSortChildren();
				ige.engine._timeSpentLastTick[this.id()].depthSortChildren = new Date().getTime() - ts;
			} else {
				this.depthSortChildren();
			}
		}

		// Loop our children and call their update methods
		if (!ige.config.debug._timing) {
			while (arrCount--) {
				arr[arrCount].update(ctx, tickDelta);
			}

			return;
		}

		while (arrCount--) {
			const ts = new Date().getTime();
			arr[arrCount].update(ctx, tickDelta);
			const td = new Date().getTime() - ts;

			if (!arr[arrCount]) {
				continue;
			}

			if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
				ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
			}

			if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
				ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
			}

			ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
			ige.engine._timeSpentLastTick[arr[arrCount].id()].tick = td;
		}

		return;
	}

	/**
     * Processes the updates required each render frame. Any code in the update()
     * method will be called ONCE for each render frame BEFORE the tick() method.
     * This differs from the tick() method in that the tick method can be called
     * multiple times during a render frame depending on how many viewports your
     * simulation is being rendered to, whereas the update() method is only called
     * once. It is therefore the perfect place to put code that will control your
     * entity's motion, AI etc.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {Number} tickDelta The delta between the last tick time and this one.
     */
	update (ctx: CanvasRenderingContext2D, tickDelta: number) {
		// Check if the entity should still exist
		if (this._deathTime !== undefined && this._deathTime <= ige.engine._tickStart) {
			// Check if the deathCallBack was set
			if (this._deathCallBack) {
				this._deathCallBack.apply(this);
				delete this._deathCallBack;
			}

			// The entity should be removed because it has died
			this.destroy();
			return;
		}

		// Check that the entity has been born
		if (ige.engine._currentTime >= this._bornTime) {
			// Remove the stream data cache
			delete this._streamDataCache;

			// Process any behaviours assigned to the entity
			this._processUpdateBehaviours(ctx, tickDelta);

			// Process velocity
			if (this._velocity.x || this._velocity.y) {
				this._translate.x += (this._velocity.x / 16) * tickDelta;
				this._translate.y += (this._velocity.y / 16) * tickDelta;
			}

			if (this._timeStream.length) {
				// Process any interpolation
				this._processInterpolate(ige.engine._tickStart - (ige.components.network as IgeNetIoComponent).stream._renderLatency);
			}

			// Check for changes to the transform values
			// directly without calling the transform methods
			this.updateTransform();

			if (!this._noAabb && this._aabbDirty) {
				// Update the aabb
				this.aabb();
			}

			this._oldTranslate = this._translate.clone();

			// Update this object's current frame alternator value
			// which allows us to determine if we are still on the
			// same frame
			this._frameAlternatorCurrent = ige.engine._frameAlternator;
		} else {
			// The entity is not yet born, unmount it and add to the spawn queue
			this._birthMount = this._parent?.id();
			this.unMount();

			ige.engine.spawnQueue(this);
		}

		// Process super class
		this._update(ctx, tickDelta);
	}

	_depthSortVisit (u: number, sortObj: IgeDepthSortObject) {
		const arr = sortObj.adj[u];
		const arrCount = arr.length;

		sortObj.c[u] = 1;

		for (let i = 0; i < arrCount; ++i) {
			const v = arr[i];

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
	_resizeEvent (event?: Event) {
		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	}

	/**
     * Called when a child object is un-mounted from this object.
     * @param obj
     * @private
     */
	_childUnMounted (obj: IgeEntity) {
	}

	/**
     * Called when this object is mounted to an object.
     * @param obj
     * @private
     */
	_mounted (obj: IgeEntity) {
	}

	/**
     * Called when this object is un-mounted from its parent.
     * @param obj
     * @private
     */
	_unMounted (obj: IgeEntity | IgeTileMap2d) {
	}

	isMounted () {
		return Boolean(this._parent);
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
	childSortingAlgorithm (val: (comparatorFunction: (a: IgeEntity, b: IgeEntity) => number) => void) {
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
		if (duringTick) {
			this._tickBehaviours = this._tickBehaviours || [];
			this._tickBehaviours.push({
				id,
				method: behaviour
			});
		} else {
			this._updateBehaviours = this._updateBehaviours || [];
			this._updateBehaviours.push({
				id,
				method: behaviour
			});
		}

		return this;
	}

	/**
     * Removes a behaviour to the object's active behaviour list by its id.
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
	removeBehaviour (id: string, duringTick = false) {
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
	hasBehaviour (id?: string, duringTick = false) {
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
     * Calls each behaviour method for the object.
     * @private
     */
	_processUpdateBehaviours (...args: any[]) {
		const arr = this._updateBehaviours;

		if (arr) {
			let arrCount = arr.length;
			while (arrCount--) {
				arr[arrCount].method(ige, this, ...args);
			}
		}
	}

	/**
     * Calls each behaviour method for the object.
     */
	_processTickBehaviours (...args: any[]) {
		const arr = this._tickBehaviours;

		if (arr) {
			let arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].method(ige, this, ...args);
			}
		}
	}

	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/
	/** ======================================================================================================== **/

	/** ======================================================================================================== **/

	/**
     * Sets the entity as visible and able to be interacted with.
     * @example #Show a hidden entity
     *     entity.show();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	show () {
		this._hidden = false;
		return this;
	}

	/**
     * Sets the entity as hidden and cannot be interacted with.
     * @example #Hide a visible entity
     *     entity.hide();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	hide () {
		this._hidden = true;
		return this;
	}

	/**
     * Checks if the entity is visible.
     * @returns {boolean} True if the entity is visible.
     */
	isVisible () {
		return !this._hidden;
	}

	/**
     * Checks if the entity is hidden.
     * @returns {boolean} True if the entity is hidden.
     */
	isHidden () {
		return this._hidden;
	}

	/**
     * Gets / sets the cache flag that determines if the entity's
     * texture rendering output should be stored on an off-screen
     * canvas instead of calling the texture.render() method each
     * tick. Useful for expensive texture calls such as rendering
     * fonts etc. If enabled, this will automatically disable advanced
     * composite caching on this entity with a call to
     * compositeCache(false).
     * @param {Boolean=} val True to enable caching, false to
     * disable caching.
     * @param {Boolean} propagateToChildren If true, calls cache()
     * on each child and all their children with the same `val`.
     * @example #Enable entity caching
     *     entity.cache(true);
     * @example #Disable entity caching
     *     entity.cache(false);
     * @example #Get caching flag value
     *     var val = entity.cache();
     * @return {*}
     */
	cache (val?: boolean, propagateToChildren = false) {
		if (val === undefined) {
			return this._cache;
		}

		this._cache = val;

		if (propagateToChildren) {
			this._children.forEach((child) => {
				if (!("cache" in child)) return;
				child.cache(val, true);
			});
		}

		if (!val) {
			// Remove the off-screen canvas
			delete this._cacheCanvas;
			return this;
		}

		// Create the off-screen canvas
		if (ige.isClient) {
			// Use a real canvas
			const canvasObj = ige.createCanvas({ smoothing: this._cacheSmoothing, pixelRatioScaling: true });
			this._cacheCanvas = canvasObj.canvas;
			this._cacheCtx = canvasObj.ctx;
		} else {
			// Use dummy objects for canvas and context
			this._cacheCanvas = new IgeDummyCanvas();
			this._cacheCtx = this._cacheCanvas.getContext("2d");
		}

		this._cacheDirty = true;

		// Switch off composite caching
		if (this.compositeCache()) {
			this.compositeCache(false);
		}

		return this;
	}

	/**
     * When using the caching system, this boolean determines if the
     * cache canvas should have image smoothing enabled or not. If
     * not set, the ige global smoothing setting will be used instead.
     * @param {Boolean=} val True to enable smoothing, false to disable.
     * @returns {*}
     */
	cacheSmoothing (val?: boolean) {
		if (val !== undefined) {
			this._cacheSmoothing = val;
			return this;
		}

		return this._cacheSmoothing;
	}

	/**
     * Gets / sets composite caching. Composite caching draws this entity
     * and all of its children (and their children etc.) to a single
     * off-screen canvas so that the entity does not need to be redrawn with
     * all its children every tick. For composite entities where little
     * change occurs this will massively increase rendering performance.
     * If enabled, this will automatically disable simple caching on this
     * entity with a call to cache(false).
     * @param {Boolean=} val
     * @param propagateToChildren
     * @example #Enable entity composite caching
     *     entity.compositeCache(true);
     * @example #Disable entity composite caching
     *     entity.compositeCache(false);
     * @example #Get composite caching flag value
     *     var val = entity.cache();
     * @return {*}
     */
	compositeCache (val?: boolean, propagateToChildren = false) {
		if (!ige.isClient) {
			return this;
		}

		if (val === undefined) {
			return this._compositeCache;
		}

		if (val) {
			// Switch off normal caching
			this.cache(false);

			// Create the off-screen canvas
			const canvasObj = ige.createCanvas({ smoothing: this._cacheSmoothing, pixelRatioScaling: true });
			this._cacheCanvas = canvasObj.canvas;
			this._cacheCtx = canvasObj.ctx;

			this._cacheDirty = true;
		}

		// Loop children and set _compositeParent to the correct value
		this._children.forEach((child) => {
			child._compositeParent = val;

			if (propagateToChildren && "compositeCache" in child) {
				child.compositeCache(val, propagateToChildren);
			}
		});

		this._compositeCache = val;
		return this;
	}

	/**
     * Gets / sets the cache dirty flag. If set to true this will
     * instruct the entity to re-draw its cached image from the
     * assigned texture. Once that occurs the flag will automatically
     * be set back to false. This works in either standard cache mode
     * or composite cache mode.
     * @param {Boolean=} val True to force a cache update.
     * @example #Get cache dirty flag value
     *     var val = entity.cacheDirty();
     * @example #Set cache dirty flag value
     *     entity.cacheDirty(true);
     * @return {*}
     */
	cacheDirty (val?: boolean) {
		if (val === undefined) {
			return this._cacheDirty;
		}

		this._cacheDirty = val;

		// Check if the entity is a child of a composite or composite
		// entity chain and propagate the dirty cache up the chain
		if (val && this._compositeParent && this._parent && "cacheDirty" in this._parent) {
			this._parent.cacheDirty(val);

			if (!this._cache && !this._compositeCache) {
				// Set clean immediately as no caching is enabled on this child
				this._cacheDirty = false;
			}
		}

		return this;
	}

	/**
     * Gets the position of the mouse relative to this entity's
     * center point.
     * @param {IgeViewport=} viewport The viewport to use as the
     * base from which the mouse position is determined. If no
     * viewport is specified then the current viewport the engine
     * is rendering to is used instead.
     * @example #Get the mouse position relative to the entity
     *     // The returned value is an object with properties x, y, z
     *     var mousePos = entity.mousePos();
     * @return {IgePoint3d} The mouse point relative to the entity
     * center.
     */
	mousePos (viewport?: IgeViewport | null): IgePoint3d {
		viewport = viewport || ige.engine._currentViewport;
		if (!viewport) {
			return new IgePoint3d(0, 0, 0);
		}

		const mp = viewport._mousePos.clone();

		// if (this._ignoreCamera) {
		//      const cam = ige.engine._currentCamera;
		// 	    mp.thisMultiply(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
		// 	    //mp.thisRotate(-cam._rotate.z);
		// 	    mp.thisAddPoint(cam._translate);
		// }

		mp.x += viewport._translate.x;
		mp.y += viewport._translate.y;
		this._transformPoint(mp);

		return mp;
	}

	/**
     * Gets the position of the mouse relative to this entity not
     * taking into account viewport translation.
     * @param {IgeViewport=} viewport The viewport to use as the
     * base from which the mouse position is determined. If no
     * viewport is specified then the current viewport the engine
     * is rendering to is used instead.
     * @example #Get absolute mouse position
     *     var mousePosAbs = entity.mousePosAbsolute();
     * @return {IgePoint3d} The mouse point relative to the entity
     * center.
     */
	mousePosAbsolute (viewport?: IgeViewport | null): IgePoint3d {
		viewport = viewport || ige.engine._currentViewport;

		if (viewport) {
			const mp = viewport._mousePos.clone();
			this._transformPoint(mp);
			return mp;
		}

		return new IgePoint3d(0, 0, 0);
	}

	/**
     * Gets the position of the mouse in world co-ordinates.
     * @param {IgeViewport=} viewport The viewport to use as the
     * base from which the mouse position is determined. If no
     * viewport is specified then the current viewport the engine
     * is rendering to is used instead.
     * @example #Get mouse position in world co-ordinates
     *     var mousePosWorld = entity.mousePosWorld();
     * @return {IgePoint3d} The mouse point relative to the world
     * center.
     */
	mousePosWorld (viewport?: IgeViewport | null): IgePoint3d {
		viewport = viewport || ige.engine._currentViewport;
		const mp = this.mousePos(viewport);
		this.localToWorldPoint(mp, viewport);

		if (this._ignoreCamera) {
			//viewport.camera._worldMatrix.getInverse().transform([mp]);
		}

		return mp;
	}

	/**
     * Rotates the entity to point at the target point around the z axis.
     * @param {IgePoint3d} point The point in world co-ordinates to
     * point the entity at.
     * @example #Point the entity at another entity
     *     entity.rotateToPoint(otherEntity.worldPosition());
     * @example #Point the entity at mouse
     *     entity.rotateToPoint(ige.engine._currentViewport.mousePos());
     * @example #Point the entity at an arbitrary point x, y
     *     entity.rotateToPoint(new IgePoint3d(x, y, 0));
     * @return {*}
     */
	rotateToPoint (point: IgePoint3d) {
		const worldPos = this.worldPosition();

		this.rotateTo(
			this._rotate.x,
			this._rotate.y,
			Math.atan2(worldPos.y - point.y, worldPos.x - point.x) - (this._parent?._rotate?.z ?? 0) + degreesToRadians(270)
		);

		return this;
	}

	/**
     * Gets / sets the texture to use as the background
     * pattern for this entity.
     * @param {IgeTexture} texture The texture to use as
     * the background.
     * @param {String=} repeat The type of repeat mode either: "repeat",
     * "repeat-x", "repeat-y" or "none".
     * @param {Boolean=} trackCamera If set to true, will track the camera
     * translation and "move" the background with the camera.
     * @param {Boolean=} isoTile If true the tiles of the background will
     * be treated as isometric and will therefore be drawn so that they are
     * layered seamlessly in isometric view.
     * @example #Set a background pattern for this entity with 2d tiling
     *     var texture = new IgeTexture('path/to/my/texture.png');
     *     entity.backgroundPattern(texture, 'repeat', true, false);
     * @example #Set a background pattern for this entity with isometric tiling
     *     var texture = new IgeTexture('path/to/my/texture.png');
     *     entity.backgroundPattern(texture, 'repeat', true, true);
     * @return {*}
     */
	backgroundPattern (texture?: IgeTexture, repeat: string = "repeat", trackCamera: boolean = false, isoTile: boolean = false) {
		if (texture !== undefined) {
			this._backgroundPattern = texture;
			this._backgroundPatternRepeat = repeat;
			this._backgroundPatternTrackCamera = trackCamera;
			this._backgroundPatternIsoTile = isoTile;
			this._backgroundPatternFill = null;
			return this;
		}

		return this._backgroundPattern;
	}

	smartBackground(): IgeSmartTexture | undefined;
	smartBackground(renderMethod?: IgeSmartTexture): this;
	smartBackground (renderMethod?: IgeSmartTexture) {
		if (renderMethod !== undefined) {
			this._smartBackground = renderMethod;
			return this;
		}

		return this._smartBackground;
	}

	/**
     * Set the object's width to the number of tile width's specified.
     * @param {Number} val Number of tiles.
     * @param {Boolean=} lockAspect If true, sets the height according
     * to the texture aspect ratio and the new width.
     * @example #Set the width of the entity based on the tile width of the map the entity is mounted to
     *     // Set the entity width to the size of 1 tile with
     *     // lock aspect enabled which will automatically size
     *     // the height as well, to maintain the aspect
     *     // ratio of the entity
     *     entity.widthByTile(1, true);
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	widthByTile (val: number, lockAspect = false) {
		if (!(this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined)) {
			throw new Error(
				"Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values."
			);
		}

		const tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2;

		this.width(val * tileSize);

		if (lockAspect) {
			if (this._texture) {
				// Calculate the height based on the new width
				const ratio = this._texture._sizeX / this._bounds2d.x;
				this.height(this._texture._sizeY / ratio);
			} else {
				this.log(
					"Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!",
					"error"
				);
			}
		}

		return this;
	}

	/**
     * Set the object's height to the number of tile height's specified.
     * @param {Number} val Number of tiles.
     * @param {Boolean=} lockAspect If true, sets the width according
     * to the texture aspect ratio and the new height.
     * @example #Set the height of the entity based on the tile height of the map the entity is mounted to
     *     // Set the entity height to the size of 1 tile with
     *     // lock aspect enabled which will automatically size
     *     // the width as well so as to maintain the aspect
     *     // ratio of the entity
     *     entity.heightByTile(1, true);
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	heightByTile (val: number, lockAspect = false) {
		if (!(this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined)) {
			throw new Error(
				"Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values."
			);
		}

		const tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2;

		this.height(val * tileSize);

		if (lockAspect) {
			if (this._texture) {
				// Calculate the width based on the new height
				const ratio = this._texture._sizeY / this._bounds2d.y;
				this.width(this._texture._sizeX / ratio);
			} else {
				this.log(
					"Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!",
					"error"
				);
			}
		}

		return this;
	}

	/**
     * Adds the object to the tile map at the passed tile co-ordinates. If
     * no tile co-ordinates are passed, will use the current tile position
     * and the tileWidth() and tileHeight() values.
     * @param {Number=} x X co-ordinate of the tile to occupy.
     * @param {Number=} y Y co-ordinate of the tile to occupy.
     * @param {Number=} width Number of tiles along the x-axis to occupy.
     * @param {Number=} height Number of tiles along the y-axis to occupy.
     */
	occupyTile (x?: number, y?: number, width?: number, height?: number) {
		// Check that the entity is mounted to a tile map
		if (this._parent && this._parent instanceof IgeTileMap2d) {
			if (x !== undefined && y !== undefined) {
				this._parent.occupyTile(x, y, width, height, this);
			} else {
				// Occupy tiles based upon tile point and tile width/height
				const trPoint = new IgePoint3d(
						this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth,
						this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight,
						0
					),
					tilePoint = this._parent.pointToTile(trPoint);

				if (this._parent._mountMode === 1) {
					tilePoint.thisToIso();
				}

				this._parent.occupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight, this);
			}
		}
		return this;
	}

	/**
     * Removes the object from the tile map at the passed tile co-ordinates.
     * If no tile co-ordinates are passed, will use the current tile position
     * and the tileWidth() and tileHeight() values.
     * @param {Number=} x X co-ordinate of the tile to un-occupy.
     * @param {Number=} y Y co-ordinate of the tile to un-occupy.
     * @param {Number=} width Number of tiles along the x-axis to un-occupy.
     * @param {Number=} height Number of tiles along the y-axis to un-occupy.
     * @private
     */
	unOccupyTile (x?: number, y?: number, width?: number, height?: number) {
		// Check that the entity is mounted to a tile map
		if (this._parent && this._parent.IgeTileMap2d) {
			if (x !== undefined && y !== undefined) {
				this._parent.unOccupyTile(x, y, width, height);
			} else {
				// Un-occupy tiles based upon tile point and tile width/height
				const trPoint = new IgePoint3d(
						this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth,
						this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight,
						0
					),
					tilePoint = this._parent.pointToTile(trPoint);

				if (this._parent._mountMode === 1) {
					tilePoint.thisToIso();
				}

				this._parent.unOccupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight);
			}
		}
		return this;
	}

	/**
     * Returns an array of tile co-ordinates that the object is currently
     * over, calculated using the current world co-ordinates of the object
     * as well as its 3d geometry.
     * @private
     * @return {Array} The array of tile co-ordinates as IgePoint3d instances.
     */
	overTiles () {
		// Check that the entity is mounted to a tile map
		if (!(this._parent && this._parent.IgeTileMap2d)) {
			return;
		}

		let x,
			y,
			tileWidth = this._tileWidth || 1,
			tileHeight = this._tileHeight || 1,
			tile = this._parent.pointToTile(this._translate),
			tileArr = [];

		for (x = 0; x < tileWidth; x++) {
			for (y = 0; y < tileHeight; y++) {
				tileArr.push(new IgePoint3d(tile.x + x, tile.y + y, 0));
			}
		}

		return tileArr;
	}

	/**
     * Gets / sets the anchor position that this entity's texture
     * will be adjusted by.
     * @param {Number=} x The x anchor value.
     * @param {Number=} y The y anchor value.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	anchor(x: number, y: number): this;
	anchor(): IgePoint2d;
	anchor (x?: number, y?: number) {
		if (x !== undefined && y !== undefined) {
			this._anchor = new IgePoint2d(x, y);
			return this;
		}

		return this._anchor;
	}

	/**
     * Gets / sets the geometry x value.
     * @param {Number=} px The new x value in pixels.
     * @param {Boolean} lockAspect
     * @example #Set the width of the entity
     *     entity.width(40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	width(px: number, lockAspect?: boolean): this;
	width(): number;
	width (px?: number, lockAspect = false) {
		if (px === undefined) {
			return this._bounds2d.x;
		}

		if (lockAspect) {
			// Calculate the height from the change in width
			const ratio = px / this._bounds2d.x;
			this.height(this._bounds2d.y * ratio);
		}

		this._bounds2d.x = px;
		this._bounds2d.x2 = px / 2;
		return this;
	}

	/**
     * Gets / sets the geometry y value.
     * @param {number=} px The new y value in pixels.
     * @param {boolean} [lockAspect]
     * @example #Set the height of the entity
     *     entity.height(40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	height(px: number, lockAspect?: boolean): this;
	height(): number;
	height (px?: number, lockAspect = false) {
		if (px === undefined) {
			return this._bounds2d.y;
		}

		if (lockAspect) {
			// Calculate the width from the change in height
			const ratio = px / this._bounds2d.y;
			this.width(this._bounds2d.x * ratio);
		}

		this._bounds2d.y = px;
		this._bounds2d.y2 = px / 2;
		return this;
	}

	/**
     * Gets / sets the 2d geometry of the entity. The x and y values are
     * relative to the center of the entity. This geometry is used when
     * rendering textures for the entity and positioning in world space as
     * well as UI positioning calculations. It holds no bearing on isometric
     * positioning.
     * @param {Number=} x The new x value in pixels.
     * @param {Number=} y The new y value in pixels.
     * @example #Set the dimensions of the entity (width and height)
     *     entity.bounds2d(40, 40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	bounds2d(x: number, y: number): this;
	bounds2d(): IgePoint2d;
	bounds2d(x: IgePoint2d): this;
	bounds2d (x?: number | IgePoint2d, y?: number) {
		if (x !== undefined && y !== undefined && typeof x === "number") {
			this._bounds2d = new IgePoint2d(x, y);
			return this;
		}

		// TODO: Is this exception still something we use?
		if (typeof x === "object" && y === undefined) {
			const bounds = x as IgePoint2d;
			// x is considered an IgePoint2d instance
			this._bounds2d = new IgePoint2d(bounds.x, bounds.y);
		}

		return this._bounds2d;
	}

	/**
     * Gets / sets the 3d geometry of the entity. The x and y values are
     * relative to the center of the entity and the z value is wholly
     * positive from the "floor". Used to define a 3d bounding cuboid for
     * the entity used in isometric depth sorting and hit testing.
     * @param {number=} x The new x value in pixels.
     * @param {number=} y The new y value in pixels.
     * @param {number=} z The new z value in pixels.
     * @example #Set the dimensions of the entity (width, height and length)
     *     entity.bounds3d(40, 40, 20);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	bounds3d(x: number, y: number, z: number): this;
	bounds3d(): IgePoint3d;
	bounds3d (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._bounds3d = new IgePoint3d(x, y, z);
			return this;
		}

		return this._bounds3d;
	}

	/**
     * Gets / sets the life span of the object in milliseconds. The life
     * span is how long the object will exist for before being automatically
     * destroyed.
     * @param {number=} milliseconds The number of milliseconds the entity
     * will live for from the current time.
     * @param {Function=} deathCallback Optional callback method to call when
     * the entity is destroyed from end of lifespan.
     * @example #Set the lifespan of the entity to 2 seconds after which it will automatically be destroyed
     *     entity.lifeSpan(2000);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	lifeSpan(milliseconds: number, deathCallback: (...args: any[]) => void): this;
	lifeSpan(): number;
	lifeSpan(milliseconds: number): this;
	lifeSpan (milliseconds?: number, deathCallback?: (...args: any[]) => void) {
		if (milliseconds !== undefined) {
			this.deathTime(ige.engine._currentTime + milliseconds, deathCallback);
			return this;
		}

		return (this.deathTime() || 0) - ige.engine._currentTime;
	}

	/**
     * Gets / sets the timestamp in milliseconds that denotes the time
     * that the entity will be destroyed. The object checks its own death
     * time during each tick and if the current time is greater than the
     * death time, the object will be destroyed.
     * @param {Number=} val The death time timestamp. This is a time relative
     * to the engine's start time of zero rather than the current time that
     * would be retrieved from new Date().getTime(). It is usually easier
     * to call lifeSpan() rather than setting the deathTime directly.
     * @param {Function=} deathCallback Optional callback method to call when
     * the entity is destroyed from end of lifespan.
     * @example #Set the death time of the entity to 60 seconds after engine start
     *     entity.deathTime(60000);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	deathTime(val: number, deathCallback?: (...args: any[]) => void): this;
	deathTime(): number | undefined;
	deathTime(val: number): this;
	deathTime (val?: number, deathCallback?: (...args: any[]) => void) {
		if (val !== undefined) {
			this._deathTime = val;

			if (deathCallback !== undefined) {
				this._deathCallBack = deathCallback;
			}
			return this;
		}

		return this._deathTime;
	}

	/**
     * Gets / sets the entity opacity from 0.0 to 1.0.
     * @param {number=} val The opacity value.
     * @example #Set the entity to half-visible
     *     entity.opacity(0.5);
     * @example #Set the entity to fully-visible
     *     entity.opacity(1.0);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	opacity(val: number): this;
	opacity(): number;
	opacity (val?: number) {
		if (val !== undefined) {
			this._opacity = val;
			return this;
		}

		return this._opacity;
	}

	/**
     * Gets / sets the noAabb flag that determines if the entity's axis
     * aligned bounding box should be calculated every tick or not. If
     * you don't need the AABB data (for instance if you don't need to
     * detect mouse events on this entity, or you DO want the AABB to be
     * updated but want to control it manually by calling aabb(true)
     * yourself as needed).
     * @param {Boolean=} val If set to true will turn off AABB calculation.
     * @returns {*}
     */
	noAabb(val: boolean): this;
	noAabb(): boolean | undefined;
	noAabb (val?: boolean) {
		if (val !== undefined) {
			this._noAabb = val;
			return this;
		}

		return this._noAabb;
	}

	/**
     * Gets / sets the texture to use when rendering the entity.
     * @param {IgeTexture=} texture The texture object.
     * @example #Set the entity texture (image)
     *     var texture = new IgeTexture('path/to/some/texture.png');
     *     entity.texture(texture);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	texture(texture: IgeTexture): this;
	texture(): IgeTexture | undefined;
	texture (texture?: IgeTexture) {
		if (texture !== undefined) {
			this._texture = texture;
			return this;
		}

		return this._texture;
	}

	/**
     * Gets / sets the current texture cell used when rendering the game
     * object's texture. If the texture is not cell-based, this value is
     * ignored.
     * @param {number|null=} val The cell index.
     * @example #Set the entity texture as a 4x4 cell sheet and then set the cell to use
     *     var texture = new IgeCellSheet('path/to/some/cellSheet.png', 4, 4);
     *     entity.texture(texture)
     *         .cell(3);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	cell(val: number | null): this;
	cell(): number | null;
	cell (val?: number | null) {
		if (val !== undefined && (val === null || val > 0)) {
			this._cell = val;
			return this;
		}

		return this._cell;
	}

	/**
     * Gets / sets the current texture cell used when rendering the game
     * object's texture. If the texture is not cell-based, this value is
     * ignored. This differs from cell() in that it accepts a string id
     * as the cell
     * @param {Number=} val The cell id.
     * @example #Set the entity texture as a sprite sheet with cell ids and then set the cell to use
     *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
     *         [0, 0, 40, 40, 'robotHead'],
     *         [40, 0, 40, 40, 'humanHead'],
     *     ]);
     *
     *     // Assign the texture, set the cell to use and then
     *     // set the entity to the size of the cell automatically!
     *     entity.texture(texture)
     *         .cellById('robotHead')
     *         .dimensionsFromCell();
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	cellById (val?: number) {
		if (val !== undefined) {
			if (this._texture) {
				// Find the cell index this id corresponds to
				const tex = this._texture;
				const cells = tex._cells;

				for (let i = 1; i < cells.length; i++) {
					if (cells[i][4] === val) {
						// Found the cell id so assign this cell index
						this.cell(i);
						return this;
					}
				}

				// We were unable to find the cell index from the cell
				// id so produce an error
				this.log(
					"Could not find the cell id \"" +
                    val +
                    "\" in the assigned entity texture " +
                    tex.id() +
                    ", please check your sprite sheet (texture) cell definition to ensure the cell id \"" +
                    val +
                    "\" has been assigned to a cell!",
					"error"
				);
			} else {
				this.log(
					"Cannot assign cell index from cell ID until an IgeSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().",
					"error"
				);
			}
		}

		return this._cell;
	}

	/**
     * Sets the geometry of the entity to match the width and height
     * of the assigned texture.
     * @param {Number=} percent The percentage size to resize to.
     * @example #Set the entity dimensions based on the assigned texture
     *     var texture = new IgeTexture('path/to/some/texture.png');
     *
     *     // Assign the texture, and then set the entity to the
     *     // size of the texture automatically!
     *     entity.texture(texture)
     *         .dimensionsFromTexture();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	dimensionsFromTexture (percent?: number) {
		if (this._texture) {
			if (percent === undefined) {
				this.width(this._texture._sizeX);
				this.height(this._texture._sizeY);
			} else {
				this.width(Math.floor((this._texture._sizeX / 100) * percent));
				this.height(Math.floor((this._texture._sizeY / 100) * percent));
			}

			// Recalculate localAabb
			this.localAabb(true);
		}

		return this;
	}

	/**
     * Sets the geometry of the entity to match the width and height
     * of the assigned texture cell. If the texture is not cell-based
     * the entire texture width / height will be used.
     * @param {Number=} percent The percentage size to resize to.
     * @example #Set the entity dimensions based on the assigned texture and cell
     *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
     *         [0, 0, 40, 40, 'robotHead'],
     *         [40, 0, 40, 40, 'humanHead'],
     *     ]);
     *
     *     // Assign the texture, set the cell to use and then
     *     // set the entity to the size of the cell automatically!
     *     entity.texture(texture)
     *         .cellById('robotHead')
     *         .dimensionsFromCell();
     * @return {*} The object this method was called from to allow
     * method chaining
     */
	dimensionsFromCell (percent?: number) {
		if (this._texture) {
			if (this._texture._cells && this._texture._cells.length && this._cell) {
				if (percent === undefined) {
					this.width(this._texture._cells[this._cell][2]);
					this.height(this._texture._cells[this._cell][3]);
				} else {
					this.width(Math.floor((this._texture._cells[this._cell][2] / 100) * percent));
					this.height(Math.floor((this._texture._cells[this._cell][3] / 100) * percent));
				}

				// Recalculate localAabb
				this.localAabb(true);
			}
		}

		return this;
	}

	/**
     * Gets / sets the highlight mode. True is on false is off.
     * @param {Boolean} val The highlight mode true, false or optionally a string representing a globalCompositeOperation.
     * https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing
     * @param highlightChildEntities
     * @example #Set the entity to render highlighted
     *     entity.highlight(true);
     * @example #Set the entity to render highlighted using 'screen' globalCompositeOperation
     *     entity.highlight('screen');
     * @example #Get the current highlight state
     *     var isHighlighted = entity.highlight();
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	highlight (val?: boolean, highlightChildEntities = true) {
		if (val !== undefined) {
			this._highlight = val;

			if (highlightChildEntities) {
				this._children.forEach((child) => {
					child.highlight(val);
				});
			}

			this.cacheDirty(true);
			return this;
		}

		return this._highlight;
	}

	/**
     * Returns the absolute world position of the entity as an
     * IgePoint3d.
     * @example #Get the world position of the entity
     *     var wordPos = entity.worldPosition();
     * @return {IgePoint3d} The absolute world position of the
     * entity.
     */
	worldPosition () {
		return new IgePoint3d(this._worldMatrix.matrix[2], this._worldMatrix.matrix[5], 0);
	}

	/**
     * Returns the absolute world rotation z of the entity as a
     * value in radians.
     * @example #Get the world rotation of the entity's z axis
     *     var wordRot = entity.worldRotationZ();
     * @return {Number} The absolute world rotation z of the
     * entity.
     */
	worldRotationZ () {
		return this._worldMatrix.rotationRadians();
	}

	/**
     * Converts an array of points from local space to this entity's
     * world space using its world transform matrix. This will alter
     * the points passed in the array directly.
     * @param {Array} points The array of IgePoints to convert.
     * @param viewport
     * @param inverse
     */
	localToWorld (points: IgePoint[], viewport?: IgeViewport, inverse = false) {
		// Commented as this was doing literally nothing
		//viewport = viewport || ige.engine._currentViewport;

		if (this._adjustmentMatrix) {
			// Apply the optional adjustment matrix
			this._worldMatrix.multiply(this._adjustmentMatrix);
		}

		if (!inverse) {
			this._worldMatrix.transform(points, this);
		} else {
			this._localMatrix.transform(points, this);
			//this._worldMatrix.getInverse().transform(points, this);
		}

		if (this._ignoreCamera) {
			//viewport.camera._worldMatrix.transform(points, this);
		}
	}

	/**
     * Converts a point from local space to this entity's world space
     * using its world transform matrix. This will alter the point's
     * data directly.
     * @param {IgePoint3d} point The IgePoint3d to convert.
     */
	localToWorldPoint (point, viewport) {
		viewport = viewport || ige.engine._currentViewport;
		this._worldMatrix.transform([point], this);
	}

	/**
     * Returns the screen position of the entity as an IgePoint3d where x is the
     * "left" and y is the "top", useful for positioning HTML elements at the
     * screen location of an IGE entity. This method assumes that the top-left
     * of the main canvas element is at 0, 0. If not you can adjust the values
     * yourself to allow for offset.
     * @example #Get the screen position of the entity
     *     var screenPos = entity.screenPosition();
     * @return {IgePoint3d} The screen position of the entity.
     */
	screenPosition () {
		if (!ige.engine._currentCamera) {
			throw new Error("Cannot get screen position of entity, ige instance has no camera!");
		}

		return new IgePoint3d(
			Math.floor(
				(this._worldMatrix.matrix[2] - ige.engine._currentCamera._translate.x) * ige.engine._currentCamera._scale.x + ige.engine.root._bounds2d.x2
			),
			Math.floor(
				(this._worldMatrix.matrix[5] - ige.engine._currentCamera._translate.y) * ige.engine._currentCamera._scale.y + ige.engine.root._bounds2d.y2
			),
			0
		);
	}

	/**
     * @deprecated Use bounds3dPolygon instead
     */
	localIsoBoundsPoly () {
	}

	localBounds3dPolygon (recalculate) {
		if (this._bounds3dPolygonDirty || !this._localBounds3dPolygon || recalculate) {
			const geom = this._bounds3d,
				poly = new IgePoly2d(),
				// Bottom face
				bf2 = toIso(+geom.x2, -geom.y2, -geom.z2),
				bf3 = toIso(+geom.x2, +geom.y2, -geom.z2),
				bf4 = toIso(-geom.x2, +geom.y2, -geom.z2),
				// Top face
				tf1 = toIso(-geom.x2, -geom.y2, geom.z2),
				tf2 = toIso(+geom.x2, -geom.y2, geom.z2),
				tf4 = toIso(-geom.x2, +geom.y2, geom.z2);

			poly.addPoint(tf1.x, tf1.y)
				.addPoint(tf2.x, tf2.y)
				.addPoint(bf2.x, bf2.y)
				.addPoint(bf3.x, bf3.y)
				.addPoint(bf4.x, bf4.y)
				.addPoint(tf4.x, tf4.y)
				.addPoint(tf1.x, tf1.y);

			this._localBounds3dPolygon = poly;
			this._bounds3dPolygonDirty = false;
		}

		return this._localBounds3dPolygon;
	}

	bounds3dPolygon (recalculate = false) {
		if (this._bounds3dPolygonDirty || !this._bounds3dPolygon || recalculate) {
			const poly = this.localBounds3dPolygon(recalculate).clone();

			// Convert local co-ordinates to world based on entities world matrix
			this.localToWorld(poly._poly);

			this._bounds3dPolygon = poly;
		}

		return this._bounds3dPolygon;
	}

	mouseInBounds3d (recalculate) {
		const poly = this.localBounds3dPolygon(recalculate),
			mp = this.mousePos();

		return poly.pointInside(mp);
	}

	/**
     * Calculates and returns the current axis-aligned bounding box in
     * world co-ordinates.
     * @param {Boolean=} recalculate If true this will force the
     * recalculation of the AABB instead of returning a cached
     * value.
     * @param inverse
     * @example #Get the entity axis-aligned bounding box dimensions
     *     var aabb = entity.aabb();
     *
     *     console.log(aabb.x);
     *     console.log(aabb.y);
     *     console.log(aabb.width);
     *     console.log(aabb.height);
     * @example #Get the entity axis-aligned bounding box dimensions forcing the engine to update the values first
     *     var aabb = entity.aabb(true); // Call with true to force update
     *
     *     console.log(aabb.x);
     *     console.log(aabb.y);
     *     console.log(aabb.width);
     *     console.log(aabb.height);
     * @return {IgeRect} The axis-aligned bounding box in world co-ordinates.
     */
	aabb (recalculate = true, inverse = false) {
		if (this._aabbDirty || !this._aabb || recalculate) {
			//  && this.newFrame()
			let poly = new IgePoly2d(),
				minX,
				minY,
				maxX,
				maxY,
				box,
				anc = this._anchor,
				ancX = anc.x,
				ancY = anc.y,
				geom,
				geomX2,
				geomY2,
				x,
				y;

			geom = this._bounds2d;
			geomX2 = geom.x2;
			geomY2 = geom.y2;

			x = geomX2;
			y = geomY2;

			poly.addPoint(-x + ancX, -y + ancY);
			poly.addPoint(x + ancX, -y + ancY);
			poly.addPoint(x + ancX, y + ancY);
			poly.addPoint(-x + ancX, y + ancY);

			this._renderPos = { x: -x + ancX, y: -y + ancY };

			// Convert the poly's points from local space to world space
			this.localToWorld(poly._poly, null, inverse);

			// Get the extents of the newly transformed poly
			minX = Math.min(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);

			minY = Math.min(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);

			maxX = Math.max(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);

			maxY = Math.max(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);

			box = new IgeRect(minX, minY, maxX - minX, maxY - minY);

			this._aabb = box;
			this._aabbDirty = false;
		}

		return this._aabb;
	}

	/**
     * Calculates and returns the local axis-aligned bounding box
     * for the entity. This is the AABB relative to the entity's
     * center point.
     * @param {Boolean=} recalculate If true this will force the
     * recalculation of the local AABB instead of returning a cached
     * value.
     * @example #Get the entity local axis-aligned bounding box dimensions
     *     var aabb = entity.localAabb();
     *
     *     console.log(aabb.x);
     *     console.log(aabb.y);
     *     console.log(aabb.width);
     *     console.log(aabb.height);
     * @example #Get the entity local axis-aligned bounding box dimensions forcing the engine to update the values first
     *     var aabb = entity.localAabb(true); // Call with true to force update
     *
     *     console.log(aabb.x);
     *     console.log(aabb.y);
     *     console.log(aabb.width);
     *     console.log(aabb.height);
     * @return {IgeRect} The local AABB.
     */
	localAabb (recalculate) {
		if (!this._localAabb || recalculate) {
			const aabb = this.aabb();
			this._localAabb = new IgeRect(
				-Math.floor(aabb.width / 2),
				-Math.floor(aabb.height / 2),
				Math.floor(aabb.width),
				Math.floor(aabb.height)
			);
		}

		return this._localAabb;
	}

	/**
     * Calculates the axis-aligned bounding box for this entity, including
     * all child entity bounding boxes and returns the final composite
     * bounds.
     * @example #Get the composite AABB
     *     var entity = new IgeEntity(),
     *         aabb = entity.compositeAabb();
     * @return {IgeRect}
     */
	compositeAabb (inverse = false) {
		const arr = this._children;
		const rect = this.aabb(true, inverse).clone();

		// Now loop all children and get the aabb for each of
		// them add those bounds to the current rect
		if (arr) {
			let arrCount = arr.length;

			while (arrCount--) {
				rect.thisCombineRect(arr[arrCount].compositeAabb(inverse));
			}
		}

		return rect;
	}

	/**
     * Gets / sets the composite stream flag. If set to true, any objects
     * mounted to this one will have their streamMode() set to the same
     * value as this entity and will also have their compositeStream flag
     * set to true. This allows you to easily automatically stream any
     * objects mounted to a root object and stream them all.
     * @param val
     * @returns {*}
     */
	compositeStream (val) {
		if (val !== undefined) {
			this._compositeStream = val;
			return this;
		}

		return this._compositeStream;
	}

	/**
     * Override the _childMounted method and apply entity-based flags.
     * @param {IgeEntity} child
     * @private
     */
	_childMounted (child: IgeEntity) {
		// Check if we need to set the compositeStream and streamMode
		if (this.compositeStream()) {
			child.compositeStream(true);
			child.streamMode(this.streamMode());
			child.streamControl(this.streamControl());
		}

		this._resizeEvent(null);

		// Check if we are compositeCached and update the cache
		if (this.compositeCache()) {
			this.cacheDirty(true);
		}
	}

	/**
     * Takes two values and returns them as an array where index [0]
     * is the y argument and index[1] is the x argument. This method
     * is used specifically in the 3d bounds intersection process to
     * determine entity depth sorting.
     * @param {Number} x The first value.
     * @param {Number} y The second value.
     * @return {Array} The swapped arguments.
     * @private
     */
	_swapVars (x, y) {
		return [y, x];
	}

	_internalsOverlap (x0, x1, y0, y1) {
		let tempSwap;

		if (x0 > x1) {
			tempSwap = this._swapVars(x0, x1);
			x0 = tempSwap[0];
			x1 = tempSwap[1];
		}

		if (y0 > y1) {
			tempSwap = this._swapVars(y0, y1);
			y0 = tempSwap[0];
			y1 = tempSwap[1];
		}

		if (x0 > y0) {
			tempSwap = this._swapVars(x0, y0);
			x0 = tempSwap[0];
			y0 = tempSwap[1];

			tempSwap = this._swapVars(x1, y1);
			x1 = tempSwap[0];
			y1 = tempSwap[1];
		}

		return y0 < x1;
	}

	_projectionOverlap (otherObject) {
		const thisG3d = this._bounds3d;
		const otherG3d = otherObject._bounds3d;

		const thisMin = {
			x: this._translate.x - thisG3d.x / 2,
			y: this._translate.y - thisG3d.y / 2,
			z: this._translate.z - thisG3d.z
		};
		const thisMax = {
			x: this._translate.x + thisG3d.x / 2,
			y: this._translate.y + thisG3d.y / 2,
			z: this._translate.z + thisG3d.z
		};

		const otherMin = {
			x: otherObject._translate.x - otherG3d.x / 2,
			y: otherObject._translate.y - otherG3d.y / 2,
			z: otherObject._translate.z - otherG3d.z
		};
		const otherMax = {
			x: otherObject._translate.x + otherG3d.x / 2,
			y: otherObject._translate.y + otherG3d.y / 2,
			z: otherObject._translate.z + otherG3d.z
		};

		return (
			this._internalsOverlap(thisMin.x - thisMax.y, thisMax.x - thisMin.y, otherMin.x - otherMax.y, otherMax.x - otherMin.y) &&
            this._internalsOverlap(thisMin.x - thisMax.z, thisMax.x - thisMin.z, otherMin.x - otherMax.z, otherMax.x - otherMin.z) &&
            this._internalsOverlap(thisMin.z - thisMax.y, thisMax.z - thisMin.y, otherMin.z - otherMax.y, otherMax.z - otherMin.y)
		);
	}

	/**
     * Compares the current entity's 3d bounds to the passed entity and
     * determines if the current entity is "behind" the passed one. If an
     * entity is behind another, it is drawn first during the scenegraph
     * render phase.
     * @param {IgeEntity} otherObject The other entity to check this
     * entity's 3d bounds against.
     * @example #Determine if this entity is "behind" another entity based on the current depth-sort
     *     var behind = entity.isBehind(otherEntity);
     * @return {Boolean} If true this entity is "behind" the passed entity
     * or false if not.
     */
	isBehind (otherObject) {
		const thisG3d = this._bounds3d,
			otherG3d = otherObject._bounds3d,
			thisTranslate = this._translate.clone(),
			otherTranslate = otherObject._translate.clone();

		// thisTranslate.thisToIso();
		// otherTranslate.thisToIso();

		if (this._origin.x !== 0.5 || this._origin.y !== 0.5) {
			thisTranslate.x += this._bounds2d.x * (0.5 - this._origin.x);
			thisTranslate.y += this._bounds2d.y * (0.5 - this._origin.y);
		}
		if (otherObject._origin.x !== 0.5 || otherObject._origin.y !== 0.5) {
			otherTranslate.x += otherObject._bounds2d.x * (0.5 - otherObject._origin.x);
			otherTranslate.y += otherObject._bounds2d.y * (0.5 - otherObject._origin.y);
		}

		const thisX = thisTranslate.x,
			thisY = thisTranslate.y,
			otherX = otherTranslate.x,
			otherY = otherTranslate.y,
			thisMin = new IgePoint3d(thisX - thisG3d.x / 2, thisY - thisG3d.y / 2, this._translate.z),
			thisMax = new IgePoint3d(thisX + thisG3d.x / 2, thisY + thisG3d.y / 2, this._translate.z + thisG3d.z),
			otherMin = new IgePoint3d(otherX - otherG3d.x / 2, otherY - otherG3d.y / 2, otherObject._translate.z),
			otherMax = new IgePoint3d(otherX + otherG3d.x / 2, otherY + otherG3d.y / 2, otherObject._translate.z + otherG3d.z);

		if (thisMax.x <= otherMin.x) {
			return false;
		}

		if (otherMax.x <= thisMin.x) {
			return true;
		}

		if (thisMax.y <= otherMin.y) {
			return false;
		}

		if (otherMax.y <= thisMin.y) {
			return true;
		}

		if (thisMax.z <= otherMin.z) {
			return false;
		}

		if (otherMax.z <= thisMin.z) {
			return true;
		}

		return thisX + thisY + this._translate.z > otherX + otherY + otherObject._translate.z;
	}

	/**
     * Get / set the flag determining if this entity will respond
     * to mouse interaction or not. When you set a mouse* event e.g.
     * mouseUp, mouseOver etc this flag will automatically be reset
     * to true.
     * @param {Boolean=} val The flag value true or false.
     * @example #Set entity to ignore mouse events
     *     entity.mouseEventsActive(false);
     * @example #Set entity to receive mouse events
     *     entity.mouseEventsActive(true);
     * @example #Get current flag value
     *     var val = entity.mouseEventsActive();
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	mouseEventsActive (val) {
		if (val !== undefined) {
			this._mouseEventsActive = val;
			return this;
		}

		return this._mouseEventsActive;
	}

	/**
     * Sets the _ignoreCamera internal flag to the value passed for this
     * and all child entities down the scenegraph.
     * @param val
     */
	ignoreCameraComposite (val) {
		let i,
			arr = this._children,
			arrCount = arr.length;

		this._ignoreCamera = val;

		for (i = 0; i < arrCount; i++) {
			if (arr[i].ignoreCameraComposite) {
				arr[i].ignoreCameraComposite(val);
			}
		}
	}

	/**
     * Determines if the frame alternator value for this entity
     * matches the engine's frame alternator value. The entity's
     * frame alternator value will be set to match the engine's
     * after each call to the entity.tick() method so the return
     * value of this method can be used to determine if the tick()
     * method has already been run for this entity.
     *
     * This is useful if you have multiple viewports which will
     * cause the entity tick() method to fire once for each viewport
     * but you only want to execute update code such as movement etc
     * on the first time the tick() method is called.
     *
     * @example #Determine if the entity has already had its tick method called
     *     var tickAlreadyCalled = entity.newFrame();
     * @return {Boolean} If false, the entity's tick method has
     * not yet been processed for this tick.
     */
	newFrame () {
		return ige.engine._frameAlternator !== this._frameAlternatorCurrent;
	}

	/**
     * Sets the canvas context transform properties to match the the game
     * object's current transform values.
     * @param {CanvasRenderingContext2D} ctx The canvas context to apply
     * the transformation matrix to.
     * @example #Transform a canvas context to the entity's local matrix values
     *     var canvas = document.createElement('canvas');
     *     canvas.width = 800;
     *     canvas.height = 600;
     *
     *     var ctx = canvas.getContext('2d');
     *     entity._transformContext(ctx);
     * @private
     */
	_transformContext (ctx, inverse) {
		if (this._parent) {
			ctx.globalAlpha = this._computedOpacity = this._parent._computedOpacity * this._opacity;
		} else {
			ctx.globalAlpha = this._computedOpacity = this._opacity;
		}

		if (!inverse) {
			this._localMatrix.transformRenderingContext(ctx);
		} else {
			this._localMatrix.getInverse().transformRenderingContext(ctx);
		}
	}

	mouseAlwaysInside (val) {
		if (val !== undefined) {
			this._mouseAlwaysInside = val;
			return this;
		}

		return this._mouseAlwaysInside;
	}

	/**
     * Processes the actions required each render frame.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {Boolean} [dontTransform] If set to true, the tick method will
     * not transform the context based on the entity's matrices. This is useful
     * if you have extended the class and want to process down the inheritance
     * chain but have already transformed the entity in a previous overloaded
     * method.
     */
	tick (ctx, dontTransform = false) {
		if (!(!this._hidden && this._inView && (!this._parent || this._parent._inView) && !this._streamJustCreated)) {
			return;
		}

		this._processTickBehaviours(ctx);

		if (this._mouseEventsActive) {
			if (this._processTriggerHitTests()) {
				// Point is inside the trigger bounds
				ige.input.queueEvent(this._mouseInTrigger, null);
			} else {
				if (ige.input.mouseMove) {
					// There is a mouse move event but we are not inside the entity
					// so fire a mouse out event (_handleMouseOut will check if the
					// mouse WAS inside before firing an out event).
					this._handleMouseOut(ige.input.mouseMove);
				}
			}
		}

		// Check for cached version
		if (this._cache || this._compositeCache) {
			// Caching is enabled
			if (this._cacheDirty) {
				// The cache is dirty, redraw it
				this._refreshCache(dontTransform);
			}

			// Now render the cached image data to the main canvas
			this._renderCache(ctx);
		} else {
			// Non-cached output
			// Transform the context by the current transform settings
			if (!dontTransform) {
				this._transformContext(ctx);
			}

			// Render the entity
			this._renderEntity(ctx, dontTransform);
		}

		if (this._streamMode === 1) {
			this.streamSync();
		}

		if (this._compositeCache) {
			if (this._cacheDirty) {
				// Process children
				this._tick(this._cacheCtx);
				this._renderCache(ctx);
				this._cacheDirty = false;
			}
		} else {
			// Process children
			this._tick(ctx);
		}
	}

	_tick (ctx: CanvasRenderingContext2D) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		let arr = this._children,
			arrCount,
			ts,
			td;

		if (!arr) {
			return;
		}

		arrCount = arr.length;

		if (ige.config.debug._timing) {
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
						if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
							ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
							ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
						ige.engine._timeSpentLastTick[arr[arrCount].id()].tick = td;
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

	_processTriggerHitTests () {
		let mp, mouseTriggerPoly;

		if (ige.engine._currentViewport) {
			if (!this._mouseAlwaysInside) {
				mp = this.mousePosWorld();

				if (mp) {
					// Use the trigger polygon if defined
					if (this._triggerPolygon && this[this._triggerPolygon]) {
						mouseTriggerPoly = this[this._triggerPolygon](mp);
					} else {
						// Default to either aabb or bounds3dPolygon depending on entity parent mounting mode
						if (this._parent && this._parent._mountMode === 1) {
							// Use bounds3dPolygon
							mouseTriggerPoly = this.bounds3dPolygon();
						} else {
							// Use aabb
							mouseTriggerPoly = this.aabb();
						}
					}

					// Check if the current mouse position is inside this aabb
					return mouseTriggerPoly.xyInside(mp.x, mp.y);
				}
			} else {
				return true;
			}
		}

		return false;
	}

	_refreshCache (dontTransform) {
		// The cache is not clean so re-draw it
		// Render the entity to the cache
		const _canvas = this._cacheCanvas;
		const _ctx = this._cacheCtx;

		if (this._compositeCache) {
			// Get the composite entity AABB and alter the internal canvas
			// to the composite size so we can render the entire entity
			const aabbC = this.compositeAabb();
			this._compositeAabbCache = aabbC;

			if (aabbC.width > 0 && aabbC.height > 0) {
				_canvas.igeSetSize(aabbC.width, aabbC.height);
				/*_canvas.width = Math.ceil(aabbC.width);
				_canvas.height = Math.ceil(aabbC.height);*/
			} else {
				// We cannot set a zero size for a canvas, it will
				// cause the browser to freak out
				_canvas.width = 2;
				_canvas.height = 2;
			}

			// Translate to the center of the canvas
			_ctx.translate(-aabbC.x, -aabbC.y);

			/**
             * Fires when the entity's composite cache is ready.
             * @event IgeEntity#compositeReady
             */
			this.emit("compositeReady");
		} else {
			if (this._bounds2d.x > 0 && this._bounds2d.y > 0) {
				_canvas.igeSetSize(this._bounds2d.x, this._bounds2d.y);
				/*_canvas.width = this._bounds2d.x;
				_canvas.height = this._bounds2d.y;*/
			} else {
				// We cannot set a zero size for a canvas, it will
				// cause the browser to freak out
				_canvas.width = 1;
				_canvas.height = 1;
			}

			// Translate to the center of the canvas
			_ctx.translate(this._bounds2d.x2, this._bounds2d.y2);

			this._cacheDirty = false;
		}

		// Transform the context by the current transform settings
		if (!dontTransform) {
			this._transformContext(_ctx);
		}

		this._renderEntity(_ctx, dontTransform);
	}

	/**
     * Handles calling the texture.render() method if a texture
     * is applied to the entity. This part of the tick process has
     * been abstracted to allow it to be overridden by an extending
     * class.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render
     * the entity to.
     * @param {Boolean} [dontTransform] If you don't want to apply transforms.
     * @private
     */
	_renderEntity (ctx: CanvasRenderingContext2D, dontTransform = false) {
		if (this._opacity <= 0) {
			return;
		}

		if (this._backgroundPattern) {
			if (!this._backgroundPatternFill) {
				// We have a pattern but no fill produced
				// from it. Check if we have a context to
				// generate a pattern from
				if (ctx) {
					// Produce the pattern fill
					this._backgroundPatternFill = ctx.createPattern(this._backgroundPattern.image, this._backgroundPatternRepeat);
				}
			}

			if (this._backgroundPatternFill) {
				// Draw the fill
				ctx.save();
				ctx.fillStyle = this._backgroundPatternFill;

				if (this._smartBackground) {
					this._smartBackground(ctx, this);
				} else {
					// TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change

					// This is the proper way to do this but firefox has a bug which I'm gonna report
					// so instead I have to use ANOTHER translate call instead. So crap!
					//ctx.rect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
					ctx.translate(-this._bounds2d.x2, -this._bounds2d.y2);
					ctx.rect(0, 0, this._bounds2d.x, this._bounds2d.y);
					if (this._backgroundPatternTrackCamera) {
						ctx.translate(-ige.engine._currentCamera._translate.x, -ige.engine._currentCamera._translate.y);
						ctx.scale(ige.engine._currentCamera._scale.x, ige.engine._currentCamera._scale.y);
					}
					ctx.fill();
					ige.metrics.drawCount++;

					if (this._backgroundPatternIsoTile) {
						ctx.translate(
							-Math.floor(this._backgroundPattern.image.width) / 2,
							-Math.floor(this._backgroundPattern.image.height / 2)
						);
						ctx.fill();
						ige.metrics.drawCount++;
					}
				}

				ctx.restore();
			}
		}

		const texture = this._texture;

		if (texture && texture._loaded) {
			// Draw the entity image
			texture.render(ctx, this, ige.engine._tickDelta);

			if (this._highlight) {
				ctx.save();
				ctx.globalCompositeOperation = this._highlightToGlobalCompositeOperation(this._highlight);
				texture.render(ctx, this);
				ctx.restore();
			}
		}

		if (this._compositeCache && ige.engine._currentViewport._drawCompositeBounds) {
			//console.log('moo');
			ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
			ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
			ctx.fillStyle = "#ffffff";
			ctx.fillText("Composite Entity", -this._bounds2d.x2, -this._bounds2d.y2 - 15);
			ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
		}
	}

	/**
     * Draws the cached off-screen canvas image data to the passed canvas
     * context.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render
     * the entity to.
     * @private
     */
	_renderCache (ctx) {
		ctx.save();
		if (this._compositeCache) {
			const aabbC = this._compositeAabbCache;
			ctx.translate(this._bounds2d.x2 + aabbC.x, this._bounds2d.y2 + aabbC.y);

			if (this._parent && this._parent._ignoreCamera) {
				// Translate the entity back to negate the scene translate
				const cam = ige.engine._currentCamera;
				//ctx.translate(-cam._translate.x, -cam._translate.y);
				/*this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
				this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);*/
			}
		}

		// We have a clean cached version so output that. We use the destination width and height
		// here because the cache canvas might not be the destination size and should be scaled
		// as it is rendered (usually because of device pixel ratio related stuff)
		ctx.drawImage(this._cacheCanvas, -this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);

		if (ige.engine._currentViewport._drawCompositeBounds) {
			ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
			ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._cacheCanvas.width, this._cacheCanvas.height);
			ctx.fillStyle = "#ffffff";
			ctx.fillText("Composite Cache", -this._bounds2d.x2, -this._bounds2d.y2 - 15);
			ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
		}

		ige.metrics.drawCount++;
		ctx.restore();
	}

	/**
     * Transforms a point by the entity's parent world matrix and
     * its own local matrix transforming the point to this entity's
     * world space.
     * @param {IgePoint3d} point The point to transform.
     * @example #Transform a point by the entity's world matrix values
     *     var point = new IgePoint3d(0, 0, 0);
     *     entity._transformPoint(point);
     *
     *     console.log(point);
     * @return {IgePoint3d} The transformed point.
     * @private
     */
	_transformPoint (point) {
		if (this._parent) {
			const tempMat = new IgeMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.getInverse().transformCoord(point, this);
		} else {
			this._localMatrix.transformCoord(point, this);
		}

		return point;
	}

	/**
     * Helper method to transform an array of points using _transformPoint.
     * @param {Array} points The points array to transform.
     * @private
     */
	_transformPoints (points) {
		let point,
			pointCount = points.length;

		while (pointCount--) {
			point = points[pointCount];
			if (this._parent) {
				const tempMat = new IgeMatrix2d();
				// Copy the parent world matrix
				tempMat.copy(this._parent._worldMatrix);
				// Apply any local transforms
				tempMat.multiply(this._localMatrix);
				// Now transform the point
				tempMat.getInverse().transformCoord(point, this);
			} else {
				this._localMatrix.transformCoord(point, this);
			}
		}
	}

	/**
     * Generates a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String} The string code fragment that will
     * reproduce this entity when evaluated.
     */
	stringify (options?: Record<string, boolean>): string {
		// Make sure we have an options object
		if (options === undefined) {
			options = {};
		}

		// Get the properties for all the super-classes
		let str = "";

		// Loop properties and add property assignment code to string
		for (const i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
				case "_opacity":
					str += ".opacity(" + this.opacity() + ")";
					break;
				case "_texture":
					str += ".texture(ige.$('" + this.texture().id() + "'))";
					break;
				case "_cell":
					str += ".cell(" + this.cell() + ")";
					break;
				case "_translate":
					if (options.transform !== false && options.translate !== false) {
						str += ".translateTo(" + this._translate.x + ", " + this._translate.y + ", " + this._translate.z + ")";
					}
					break;
				case "_rotate":
					if (options.transform !== false && options.rotate !== false) {
						str += ".rotateTo(" + this._rotate.x + ", " + this._rotate.y + ", " + this._rotate.z + ")";
					}
					break;
				case "_scale":
					if (options.transform !== false && options.scale !== false) {
						str += ".scaleTo(" + this._scale.x + ", " + this._scale.y + ", " + this._scale.z + ")";
					}
					break;
				case "_origin":
					if (options.origin !== false) {
						str += ".originTo(" + this._origin.x + ", " + this._origin.y + ", " + this._origin.z + ")";
					}
					break;
				case "_anchor":
					if (options.anchor !== false) {
						str += ".anchor(" + this._anchor.x + ", " + this._anchor.y + ")";
					}
					break;
				case "_width":
					if (typeof this.width() === "string") {
						str += ".width('" + this.width() + "')";
					} else {
						str += ".width(" + this.width() + ")";
					}
					break;
				case "_height":
					if (typeof this.height() === "string") {
						str += ".height('" + this.height() + "')";
					} else {
						str += ".height(" + this.height() + ")";
					}
					break;
				case "_bounds3d":
					str += ".bounds3d(" + this._bounds3d.x + ", " + this._bounds3d.y + ", " + this._bounds3d.z + ")";
					break;
				case "_deathTime":
					if (options.deathTime !== false && options.lifeSpan !== false) {
						str += ".deathTime(" + this.deathTime() + ")";
					}
					break;
				case "_highlight":
					str += ".highlight(" + this.highlight() + ")";
					break;
				}
			}
		}

		return str;
	}

	/**
     * Destroys the entity by removing it from the scenegraph,
     * calling destroy() on any child entities and removing
     * any active event listeners for the entity. Once an entity
     * has been destroyed its this._alive flag is also set to
     * false.
     * @example #Destroy the entity
     *     entity.destroy();
     */
	destroy () {
		this._alive = false;

		/* CEXCLUDE */
		// Check if the entity is streaming
		if (this._streamMode === 1) {
			delete this._streamDataCache;
			this.streamDestroy();
		}
		/* CEXCLUDE */

		/**
         * Fires when the entity has been destroyed.
         * @event IgeEntity#destroyed
         * @param {IgeEntity} The entity that has been destroyed.
         */
		this.emit("destroyed", this);

		// Remove ourselves from any parent
		this.unMount();

		// Remove any children
		if (this._children) {
			this.destroyChildren();
		}

		// Remove the object from the lookup system
		ige.unRegister(this);

		// Set a flag in case a reference to this object
		// has been held somewhere, shows that the object
		// should no longer be interacted with
		this._alive = false;

		// Remove the event listeners array in case any
		// object references still exist there
		delete this._eventListeners;

		return this;
	}

	saveSpecialProp (obj, i) {
		switch (i) {
		case "_texture":
			if (obj._texture) {
				return { _texture: obj._texture.id() };
			}
			break;

		default:
			// Call super-class saveSpecialProp
			return super.saveSpecialProp(obj, i);
			break;
		}

		return undefined;
	}

	loadSpecialProp (obj, i) {
		switch (i) {
		case "_texture":
			return { _texture: ige.$(obj[i]) };
			break;

		default:
			// Call super-class loadSpecialProp
			return super.loadSpecialProp(obj, i);
			break;
		}

		return undefined;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERACTION
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
     * Gets / sets the callback that is fired when a mouse
     * move event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse move event and stop it propagating further down the scenegraph
     *     entity.mouseMove(function (event, control) {
     *         // Mouse moved with button
     *         console.log('Mouse move button: ' + event.button);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseMove = (callback) => {
		if (callback) {
			this._mouseMove = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseMove;
	};

	/**
     * Gets / sets the callback that is fired when a mouse
     * over event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse over event and stop it propagating further down the scenegraph
     *     entity.mouseOver(function (event, control) {
     *         // Mouse over with button
     *         console.log('Mouse over button: ' + event.button);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseOver = (callback) => {
		if (callback) {
			this._mouseOver = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOver;
	};

	/**
     * Gets / sets the callback that is fired when a mouse
     * out event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse out event and stop it propagating further down the scenegraph
     *     entity.mouseOut(function (event, control) {
     *         // Mouse out with button
     *         console.log('Mouse out button: ' + event.button);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseOut = (callback) => {
		if (callback) {
			this._mouseOut = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOut;
	};

	/**
     * Gets / sets the callback that is fired when a mouse
     * up event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse up event and stop it propagating further down the scenegraph
     *     entity.mouseUp(function (event, control) {
     *         // Mouse up with button
     *         console.log('Mouse up button: ' + event.button);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseUp = (callback) => {
		if (callback) {
			this._mouseUp = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseUp;
	};

	/**
     * Gets / sets the callback that is fired when a mouse
     * down event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse down event and stop it propagating further down the scenegraph
     *     entity.mouseDown(function (event, control) {
     *         // Mouse down with button
     *         console.log('Mouse down button: ' + event.button);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseDown = (callback) => {
		if (callback) {
			this._mouseDown = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseDown;
	};

	/**
     * Gets / sets the callback that is fired when a mouse
     * wheel event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse wheel event and stop it propagating further down the scenegraph
     *     entity.mouseWheel(function (event, control) {
     *         // Mouse wheel with button
     *         console.log('Mouse wheel button: ' + event.button);
     *         console.log('Mouse wheel delta: ' + event.wheelDelta);
     *
     *         // Stop the event propagating further down the scenegraph
     *         control.stopPropagation();
     *
     *         // You can ALSO stop propagation without the control object
     *         // reference via the global reference:
     *         ige.input.stopPropagation();
     *     });
     * @return {*}
     */
	mouseWheel = (callback) => {
		if (callback) {
			this._mouseWheel = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseWheel;
	};

	/**
     * Removes the callback that is fired when a mouse
     * move event is triggered.
     */
	mouseMoveOff () {
		delete this._mouseMove;

		return this;
	}

	/**
     * Removes the callback that is fired when a mouse
     * over event is triggered.
     */
	mouseOverOff () {
		delete this._mouseOver;

		return this;
	}

	/**
     * Removes the callback that is fired when a mouse
     * out event is triggered.
     */
	mouseOutOff () {
		delete this._mouseOut;

		return this;
	}

	/**
     * Removes the callback that is fired when a mouse
     * up event is triggered.
     */
	mouseUpOff () {
		delete this._mouseUp;

		return this;
	}

	/**
     * Removes the callback that is fired when a mouse
     * down event is triggered if the listener was registered
     * via the mouseDown() method.
     */
	mouseDownOff () {
		delete this._mouseDown;

		return this;
	}

	/**
     * Removes the callback that is fired when a mouse
     * wheel event is triggered.
     */
	mouseWheelOff () {
		delete this._mouseWheel;

		return this;
	}

	triggerPolygon (poly) {
		if (poly !== undefined) {
			this._triggerPolygon = poly;
			return this;
		}

		return this._triggerPolygon;
	}

	/**
     * Gets / sets the shape / polygon that the mouse events
     * are triggered against. There are two options, 'aabb' and
     * 'isoBounds'. The default is 'aabb'.
     * @param val
     * @returns {*}
     * @deprecated
     */
	mouseEventTrigger = (val) => {
		this.log("mouseEventTrigger is no longer in use. Please see triggerPolygon() instead.", "warning");
		/*if (val !== undefined) {
			// Set default value
			this._mouseEventTrigger = 0;

			switch (val) {
				case 'isoBounds':
					this._mouseEventTrigger = 1;
					break;

				case 'custom':
					this._mouseEventTrigger = 2;
					break;

				case 'aabb':
					this._mouseEventTrigger = 0;
					break;
			}
			return this;
		}

		return this._mouseEventTrigger === 0 ? 'aabb' : 'isoBounds';*/
	};

	/**
     * Handler method that determines which mouse-move event
     * to fire, a mouse-over or a mouse-move.
     * @private
     */
	_handleMouseIn = (event, evc, data) => {
		// Check if the mouse move is a mouse over
		if (!this._mouseStateOver) {
			this._mouseStateOver = true;
			if (this._mouseOver) {
				this._mouseOver(event, evc, data);
			}

			/**
             * Fires when the mouse moves over the entity.
             * @event IgeEntity#mouseOver
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
			this.emit("mouseOver", [event, evc, data]);
		}

		if (this._mouseMove) {
			this._mouseMove(event, evc, data);
		}
		this.emit("mouseMove", [event, evc, data]);
	};

	/**
     * Handler method that determines if a mouse-out event
     * should be fired.
     * @private
     */
	_handleMouseOut = (event, evc, data) => {
		// The mouse went away from this entity so
		// set mouse-down to false, regardless of the situation
		this._mouseStateDown = false;

		// Check if the mouse move is a mouse out
		if (this._mouseStateOver) {
			this._mouseStateOver = false;
			if (this._mouseOut) {
				this._mouseOut(event, evc, data);
			}

			/**
             * Fires when the mouse moves away from the entity.
             * @event IgeEntity#mouseOut
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
			this.emit("mouseOut", [event, evc, data]);
		}
	};

	/**
     * Handler method that determines if a mouse-wheel event
     * should be fired.
     * @private
     */
	_handleMouseWheel = (event, evc, data) => {
		if (this._mouseWheel) {
			this._mouseWheel(event, evc, data);
		}

		/**
         * Fires when the mouse wheel is moved over the entity.
         * @event IgeEntity#mouseWheel
         * @param {Object} The DOM event object.
         * @param {Object} The IGE event control object.
         * @param {*} Any further event data.
         */
		this.emit("mouseWheel", [event, evc, data]);
	};

	/**
     * Handler method that determines if a mouse-up event
     * should be fired.
     * @private
     */
	_handleMouseUp = (event, evc, data) => {
		// Reset the mouse-down flag
		this._mouseStateDown = false;
		if (this._mouseUp) {
			this._mouseUp(event, evc, data);
		}

		/**
         * Fires when a mouse up occurs on the entity.
         * @event IgeEntity#mouseUp
         * @param {Object} The DOM event object.
         * @param {Object} The IGE event control object.
         * @param {*} Any further event data.
         */
		this.emit("mouseUp", [event, evc, data]);
	};

	/**
     * Handler method that determines if a mouse-down event
     * should be fired.
     * @private
     */
	_handleMouseDown = (event, evc, data) => {
		if (!this._mouseStateDown) {
			this._mouseStateDown = true;

			if (this._mouseDown) {
				this._mouseDown(event, evc, data);
			}

			/**
             * Fires when a mouse down occurs on the entity.
             * @event IgeEntity#mouseDown
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
			this.emit("mouseDown", [event, evc, data]);
		}
	};

	/**
     * Checks mouse input types and fires the correct mouse event
     * handler. This is an internal method that should never be
     * called externally.
     * @param {Object} evc The input component event control object.
     * @param {Object} data Data passed by the input component into
     * the new event.
     * @private
     */
	_mouseInTrigger = (evc, data) => {
		if (ige.input.mouseMove) {
			// There is a mouse move event
			this._handleMouseIn(ige.input.mouseMove, evc, data);
		}

		if (ige.input.mouseDown) {
			// There is a mouse down event
			this._handleMouseDown(ige.input.mouseDown, evc, data);
		}

		if (ige.input.mouseUp) {
			// There is a mouse up event
			this._handleMouseUp(ige.input.mouseUp, evc, data);
		}

		if (ige.input.mouseWheel) {
			// There is a mouse wheel event
			this._handleMouseWheel(ige.input.mouseWheel, evc, data);
		}
	};

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// TRANSFORM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
     * Enables tracing calls which inadvertently assign NaN values to
     * transformation properties. When called on an entity this system
     * will break with a debug line when a transform property is set
     * to NaN allowing you to step back through the call stack and
     * determine where the offending value originated.
     * @returns {IgeEntity}
     */
	debugTransforms () {
		ige.traceSet(this._translate, "x", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._translate, "y", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._translate, "z", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._rotate, "x", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._rotate, "y", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._rotate, "z", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._scale, "x", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._scale, "y", 1, (val) => {
			return isNaN(val);
		});

		ige.traceSet(this._scale, "z", 1, (val) => {
			return isNaN(val);
		});

		return this;
	}

	velocityTo (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._velocity.x = x;
			this._velocity.y = y;
			this._velocity.z = z;
		} else {
			this.log("velocityTo() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	velocityBy (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._velocity.x += x;
			this._velocity.y += y;
			this._velocity.z += z;
		} else {
			this.log("velocityBy() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Translates the entity by adding the passed values to
     * the current translation values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Translate the entity by 10 along the x axis
     *     entity.translateBy(10, 0, 0);
     * @return {*}
     */
	translateBy (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._translate.x += x;
			this._translate.y += y;
			this._translate.z += z;
		} else {
			this.log("translateBy() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Translates the entity to the passed values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Translate the entity to 10, 0, 0
     *     entity.translateTo(10, 0, 0);
     * @return {*}
     */
	translateTo (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._translate.x = x;
			this._translate.y = y;
			this._translate.z = z;
		} else {
			this.log("translateTo() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Translates the entity to the passed point.
     * @param {IgePoint3d} point The point with co-ordinates.
     * @example #Translate the entity to 10, 0, 0
     *     var point = new IgePoint3d(10, 0, 0),
     *         entity = new IgeEntity();
     *
     *     entity.translateToPoint(point);
     * @return {*}
     */
	translateToPoint (point) {
		if (point !== undefined) {
			this._translate.x = point.x;
			this._translate.y = point.y;
			this._translate.z = point.z;
		} else {
			this.log("translateToPoint() called with a missing or undefined point parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Translates the object to the tile co-ordinates passed.
     * @param {Number} x The x tile co-ordinate.
     * @param {Number} y The y tile co-ordinate.
     * @param {Number=} z The z tile co-ordinate.
     * @example #Translate entity to tile
     *     // Create a tile map
     *     var tileMap = new IgeTileMap2d()
     *         .tileWidth(40)
     *         .tileHeight(40);
     *
     *     // Mount our entity to the tile map
     *     entity.mount(tileMap);
     *
     *     // Translate the entity to the tile x:10, y:12
     *     entity.translateToTile(10, 12, 0);
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
	translateToTile (x?: number, y?: number, z?: number) {
		if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
			let finalZ;

			// Handle being passed a z co-ordinate
			if (z !== undefined) {
				finalZ = z * this._parent._tileWidth;
			} else {
				finalZ = this._translate.z;
			}

			this.translateTo(
				x * this._parent._tileWidth + this._parent._tileWidth / 2,
				y * this._parent._tileHeight + this._parent._tileWidth / 2,
				finalZ
			);
		} else {
			this.log(
				"Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.",
				"warning"
			);
		}

		return this;
	}

	/**
     * Gets the translate accessor object.
     * @example #Use the translate accessor object to alter the y co-ordinate of the entity to 10
     *     entity.translate().y(10);
     * @return {*}
     */
	translate = (...args) => {
		if (args.length) {
			this.log("You called translate with arguments, did you mean translateTo or translateBy instead of translate?", "warning");
		}

		return (
			this._entity || {
				x: this._translateAccessorX,
				y: this._translateAccessorY,
				z: this._translateAccessorZ
			}
		);
	};

	/**
     * The translate accessor method for the x axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_translateAccessorX = (val) => {
		if (val !== undefined) {
			this._translate.x = val;
			return this._entity || this;
		}

		return this._translate.x;
	};

	/**
     * The translate accessor method for the y axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_translateAccessorY (val) {
		if (val !== undefined) {
			this._translate.y = val;
			return this._entity || this;
		}

		return this._translate.y;
	}

	/**
     * The translate accessor method for the z axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_translateAccessorZ = (val) => {
		// TODO: Do we need to do anything to the matrix here for iso views?
		//this._localMatrix.translateTo(this._translate.x, this._translate.y);
		if (val !== undefined) {
			this._translate.z = val;
			return this._entity || this;
		}

		return this._translate.z;
	};

	/**
     * Rotates the entity by adding the passed values to
     * the current rotation values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Rotate the entity by 10 degrees about the z axis
     *     entity.rotateBy(0, 0, degreesToRadians(10));
     * @return {*}
     */
	rotateBy (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._rotate.x += x;
			this._rotate.y += y;
			this._rotate.z += z;
		} else {
			this.log("rotateBy() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Rotates the entity to the passed values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Rotate the entity to 10 degrees about the z axis
     *     entity.rotateTo(0, 0, degreesToRadians(10));
     * @return {*}
     */
	rotateTo (x: number, y: number, z: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._rotate.x = x;
			this._rotate.y = y;
			this._rotate.z = z;
		} else {
			this.log("rotateTo() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Gets the translate accessor object.
     * @example #Use the rotate accessor object to rotate the entity about the z axis 10 degrees
     *     entity.rotate().z(degreesToRadians(10));
     * @return {*}
     */
	rotate (...args) {
		if (args.length) {
			this.log("You called rotate with arguments, did you mean rotateTo or rotateBy instead of rotate?", "warning");
		}

		return (
			this._entity || {
				x: this._rotateAccessorX,
				y: this._rotateAccessorY,
				z: this._rotateAccessorZ
			}
		);
	}

	/**
     * The rotate accessor method for the x axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_rotateAccessorX = (val) => {
		if (val !== undefined) {
			this._rotate.x = val;
			return this._entity || this;
		}

		return this._rotate.x;
	};

	/**
     * The rotate accessor method for the y axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_rotateAccessorY = (val) => {
		if (val !== undefined) {
			this._rotate.y = val;
			return this._entity || this;
		}

		return this._rotate.y;
	};

	/**
     * The rotate accessor method for the z axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_rotateAccessorZ = (val) => {
		if (val !== undefined) {
			this._rotate.z = val;
			return this._entity || this;
		}

		return this._rotate.z;
	};

	/**
     * Scales the entity by adding the passed values to
     * the current scale values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Scale the entity by 2 on the x axis
     *     entity.scaleBy(2, 0, 0);
     * @return {*}
     */
	scaleBy (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._scale.x += x;
			this._scale.y += y;
			this._scale.z += z;
		} else {
			this.log("scaleBy() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Scale the entity to the passed values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Set the entity scale to 1 on all axes
     *     entity.scaleTo(1, 1, 1);
     * @return {*}
     */
	scaleTo (x?: number, y?: number, z?: number) {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("scaleTo() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;

		return this._entity || this;
	}

	/**
     * Gets the scale accessor object.
     * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
     *     entity.scale().x(1);
     * @return {*}
     */
	scale (...args: any[]) {
		if (args.length) {
			throw new Error("You called scale with arguments, did you mean scaleTo or scaleBy instead of scale?");
		}

		return (
			this._entity || {
				x: this._scaleAccessorX,
				y: this._scaleAccessorY,
				z: this._scaleAccessorZ
			}
		);
	}

	/**
     * The scale accessor method for the x axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_scaleAccessorX = (val) => {
		if (val !== undefined) {
			this._scale.x = val;
			return this._entity || this;
		}

		return this._scale.x;
	};

	/**
     * The scale accessor method for the y axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_scaleAccessorY = (val) => {
		if (val !== undefined) {
			this._scale.y = val;
			return this._entity || this;
		}

		return this._scale.y;
	};

	/**
     * The scale accessor method for the z axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_scaleAccessorZ = (val) => {
		if (val !== undefined) {
			this._scale.z = val;
			return this._entity || this;
		}

		return this._scale.z;
	};

	/**
     * Sets the origin of the entity by adding the passed values to
     * the current origin values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Add 0.5 to the origin on the x axis
     *     entity.originBy(0.5, 0, 0);
     * @return {*}
     */
	originBy (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._origin.x += x;
			this._origin.y += y;
			this._origin.z += z;
		} else {
			this.log("originBy() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Set the origin of the entity to the passed values.
     * @param {Number} x The x co-ordinate.
     * @param {Number} y The y co-ordinate.
     * @param {Number} z The z co-ordinate.
     * @example #Set the entity origin to 0.5 on all axes
     *     entity.originTo(0.5, 0.5, 0.5);
     * @return {*}
     */
	originTo (x?: number, y?: number, z?: number) {
		if (x !== undefined && y !== undefined && z !== undefined) {
			this._origin.x = x;
			this._origin.y = y;
			this._origin.z = z;
		} else {
			this.log("originTo() called with a missing or undefined x, y or z parameter!", "error");
		}

		return this._entity || this;
	}

	/**
     * Gets the origin accessor object.
     * @example #Use the origin accessor object to set the origin of the entity on the x axis to 1
     *     entity.origin().x(1);
     * @return {*}
     */
	origin () {
		return (
			this._entity || {
				x: this._originAccessorX,
				y: this._originAccessorY,
				z: this._originAccessorZ
			}
		);
	}

	/**
     * The origin accessor method for the x axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_originAccessorX = (val) => {
		if (val !== undefined) {
			this._origin.x = val;
			return this._entity || this;
		}

		return this._origin.x;
	};

	/**
     * The origin accessor method for the y axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_originAccessorY = (val) => {
		if (val !== undefined) {
			this._origin.y = val;
			return this._entity || this;
		}

		return this._origin.y;
	};

	/**
     * The origin accessor method for the z axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {Number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
	_originAccessorZ = (val) => {
		if (val !== undefined) {
			this._origin.z = val;
			return this._entity || this;
		}

		return this._origin.z;
	};

	_rotatePoint (point, radians, origin) {
		const cosAngle = Math.cos(radians),
			sinAngle = Math.sin(radians);

		return {
			x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
			y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
		};
	}

	/**
     * Checks the current transform values against the previous ones. If
     * any value is different, the appropriate method is called which will
     * update the transformation matrix accordingly.
     */
	updateTransform () {
		this._localMatrix.identity();

		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		}

		if (this._mode === 1) {
			// iso translation
			const isoPoint = (this._translateIso = new IgePoint3d(
				this._translate.x,
				this._translate.y,
				this._translate.z + this._bounds3d.z / 2
			).toIso());

			if (this._parent && this._parent._bounds3d.z) {
				// This adjusts the child entity so that 0, 0, 0 inside the
				// parent is the center of the base of the parent
				isoPoint.y += this._parent._bounds3d.z / 1.6;
			}

			this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
		}

		this._localMatrix.rotateBy(this._rotate.z);
		this._localMatrix.scaleBy(this._scale.x, this._scale.y);

		// Adjust local matrix for origin values if not at center
		if (this._origin.x !== 0.5 || this._origin.y !== 0.5) {
			this._localMatrix.translateBy(this._bounds2d.x * (0.5 - this._origin.x), this._bounds2d.y * (0.5 - this._origin.y));
		}

		// TODO: If the parent and local transforms are unchanged, we should used cached values
		if (this._parent) {
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}

		// Check if the world matrix has changed and if so, set a few flags
		// to allow other methods to know that a matrix change has occurred
		if (!this._worldMatrix.compare(this._oldWorldMatrix)) {
			this._oldWorldMatrix.copy(this._worldMatrix);
			this._transformChanged = true;
			this._aabbDirty = true;
			this._bounds3dPolygonDirty = true;

			this.cacheDirty(true);
		} else {
			this._transformChanged = false;
		}

		// Check if the geometry has changed and if so, update the aabb dirty
		if (!this._oldBounds2d.compare(this._bounds2d)) {
			this._aabbDirty = true;

			// Record the new geometry to the oldGeometry data
			this._oldBounds2d.copy(this._bounds2d);
		}

		if (!this._oldBounds3d.compare(this._bounds3d)) {
			this._bounds3dPolygonDirty = true;

			// Record the new geometry to the oldGeometry data
			this._oldBounds3d.copy(this._bounds3d);
		}

		return this;
	}

	/**
     * Gets / sets the disable interpolation flag. If set to true then
     * stream data being received by the client will not be interpolated
     * and will be instantly assigned instead. Useful if your entity's
     * transformations should not be interpolated over time.
     * @param val
     * @returns {*}
     */
	disableInterpolation (val) {
		if (val !== undefined) {
			this._disableInterpolation = val;
			return this;
		}

		return this._disableInterpolation;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// STREAM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
     * Gets / sets the array of sections that this entity will
     * encode into its stream data.
     * @param {Array=} sectionArray An array of strings.
     * @example #Define the sections this entity will use in the network stream. Use the default "transform" section as well as a "custom1" section
     *     entity.streamSections('transform', 'custom1');
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	streamSections (sectionArray) {
		if (sectionArray !== undefined) {
			this._streamSections = sectionArray;
			return this;
		}

		return this._streamSections;
	}

	/**
     * Adds a section into the existing streamed sections array.
     * @param {String} sectionName The section name to add.
     */
	streamSectionsPush (sectionName) {
		this._streamSections = this._streamSections || [];
		this._streamSections.push(sectionName);

		return this;
	}

	/**
     * Removes a section into the existing streamed sections array.
     * @param {String} sectionName The section name to remove.
     */
	streamSectionsPull (sectionName) {
		if (this._streamSections) {
			arrPull(this._streamSections, sectionName);
		}

		return this;
	}

	/**
     * Gets / sets a streaming property on this entity. If set, the
     * property's new value is streamed to clients on the next packet.
     *
     * @param {String} propName The name of the property to get / set.
     * @param {*=} propVal Optional. If provided, the property is set
     * to this value.
     * @return {*} "this" when a propVal argument is passed to allow method
     * chaining or the current value if no propVal argument is specified.
     */
	streamProperty (propName, propVal) {
		this._streamProperty = this._streamProperty || {};
		//this._streamPropertyChange = this._streamPropertyChange || {};

		if (propName !== undefined) {
			if (propVal !== undefined) {
				//this._streamPropertyChange[propName] = this._streamProperty[propName] !== propVal;
				this._streamProperty[propName] = propVal;

				return this;
			}

			return this._streamProperty[propName];
		}

		return undefined;
	}

	/**
     * Gets / sets the data for the specified data section id. This method
     * is usually not called directly and instead is part of the network
     * stream system. General use case is to write your own custom streamSectionData
     * method in a class that extends IgeEntity so that you can control the
     * data that the entity will send and receive over the network stream.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {*=} data If present, this is the data that has been sent
     * from the server to the client for this entity.
     * @param {Boolean=} bypassTimeStream If true, will assign transform
     * directly to entity instead of adding the values to the time stream.
     * @return {*} "this" when a data argument is passed to allow method
     * chaining or the current value if no data argument is specified.
     */
	streamSectionData (sectionId, data, bypassTimeStream) {
		switch (sectionId) {
		case "transform":
			if (data) {
				// We have received updated data
				const dataArr = data.split(",");

				if (!this._disableInterpolation && !bypassTimeStream && !this._streamJustCreated) {
					// Translate
					if (dataArr[0]) {
						dataArr[0] = parseFloat(dataArr[0]);
					}
					if (dataArr[1]) {
						dataArr[1] = parseFloat(dataArr[1]);
					}
					if (dataArr[2]) {
						dataArr[2] = parseFloat(dataArr[2]);
					}

					// Scale
					if (dataArr[3]) {
						dataArr[3] = parseFloat(dataArr[3]);
					}
					if (dataArr[4]) {
						dataArr[4] = parseFloat(dataArr[4]);
					}
					if (dataArr[5]) {
						dataArr[5] = parseFloat(dataArr[5]);
					}

					// Rotate
					if (dataArr[6]) {
						dataArr[6] = parseFloat(dataArr[6]);
					}
					if (dataArr[7]) {
						dataArr[7] = parseFloat(dataArr[7]);
					}
					if (dataArr[8]) {
						dataArr[8] = parseFloat(dataArr[8]);
					}

					// Add it to the time stream
					this._timeStream.push([ige.components.network.stream._streamDataTime + ige.components.network._latency, dataArr]);

					// Check stream length, don't allow higher than 10 items
					if (this._timeStream.length > 10) {
						// Remove the first item
						this._timeStream.shift();
					}
				} else {
					// Assign all the transform values immediately
					if (dataArr[0]) {
						this._translate.x = parseFloat(dataArr[0]);
					}
					if (dataArr[1]) {
						this._translate.y = parseFloat(dataArr[1]);
					}
					if (dataArr[2]) {
						this._translate.z = parseFloat(dataArr[2]);
					}

					// Scale
					if (dataArr[3]) {
						this._scale.x = parseFloat(dataArr[3]);
					}
					if (dataArr[4]) {
						this._scale.y = parseFloat(dataArr[4]);
					}
					if (dataArr[5]) {
						this._scale.z = parseFloat(dataArr[5]);
					}

					// Rotate
					if (dataArr[6]) {
						this._rotate.x = parseFloat(dataArr[6]);
					}
					if (dataArr[7]) {
						this._rotate.y = parseFloat(dataArr[7]);
					}
					if (dataArr[8]) {
						this._rotate.z = parseFloat(dataArr[8]);
					}

					// If we are using composite caching ensure we update the cache
					if (this._compositeCache) {
						this.cacheDirty(true);
					}
				}
			} else {
				// We should return stringified data
				return (
					this._translate.toString(this._streamFloatPrecision) +
                        "," + // translate
                        this._scale.toString(this._streamFloatPrecision) +
                        "," + // scale
                        this._rotate.toString(this._streamFloatPrecision) +
                        ","
				); // rotate
			}
			break;

		case "depth":
			if (data !== undefined) {
				if (ige.isClient) {
					this.depth(parseInt(data));
				}
			} else {
				return String(this.depth());
			}
			break;

		case "layer":
			if (data !== undefined) {
				if (ige.isClient) {
					this.layer(parseInt(data));
				}
			} else {
				return String(this.layer());
			}
			break;

		case "bounds2d":
			if (data !== undefined) {
				if (ige.isClient) {
					var geom = data.split(",");
					this.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
				}
			} else {
				return String(this._bounds2d.x + "," + this._bounds2d.y);
			}
			break;

		case "bounds3d":
			if (data !== undefined) {
				if (ige.isClient) {
					var geom = data.split(",");
					this.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
				}
			} else {
				return String(this._bounds3d.x + "," + this._bounds3d.y + "," + this._bounds3d.z);
			}
			break;

		case "hidden":
			if (data !== undefined) {
				if (ige.isClient) {
					if (data === "true") {
						this.hide();
					} else {
						this.show();
					}
				}
			} else {
				return String(this.isHidden());
			}
			break;

		case "mount":
			if (data !== undefined) {
				if (ige.isClient) {
					if (data) {
						const newParent = ige.$(data);

						if (newParent) {
							this.mount(newParent);
						}
					} else {
						// Unmount
						this.unMount();
					}
				}
			} else {
				const parent = this.parent();

				if (parent) {
					return this.parent().id();
				} else {
					return "";
				}
			}
			break;

		case "origin":
			if (data !== undefined) {
				if (ige.isClient) {
					var geom = data.split(",");
					this.origin(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
				}
			} else {
				return String(this._origin.x + "," + this._origin.y + "," + this._origin.z);
			}
			break;

		case "props":
			var newData, changed, i;

			if (data !== undefined) {
				if (ige.isClient) {
					const props = JSON.parse(data);

					// Update properties that have been sent through
					for (i in props) {
						changed = false;
						if (props.hasOwnProperty(i)) {
							if (this._streamProperty[i] != props[i]) {
								changed = true;
							}
							this._streamProperty[i] = props[i];

							this.emit("streamPropChange", [i, props[i]]);
						}
					}
				}
			} else {
				newData = {};

				for (i in this._streamProperty) {
					if (this._streamProperty.hasOwnProperty(i)) {
						//if (this._streamPropertyChange[i]) {
						newData[i] = this._streamProperty[i];
						//this._streamPropertyChange[i] = false;
						//}
					}
				}

				return JSON.stringify(newData);
			}
			break;
		}
	}

	/* CEXCLUDE */
	/**
     * Gets / sets the stream mode that the stream system will use when
     * handling pushing data updates to connected clients.
     * @param {Number=} val A value representing the stream mode.
     * @example #Set the entity to disable streaming
     *     entity.streamMode(0);
     * @example #Set the entity to automatic streaming
     *     entity.streamMode(1);
     * @example #Set the entity to manual (advanced mode) streaming
     *     entity.streamMode(2);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	streamMode (val) {
		if (val !== undefined) {
			if (ige.isServer) {
				this._streamMode = val;
			}
			return this;
		}

		return this._streamMode;
	}

	/**
     * Gets / sets the stream control callback function that will be called
     * each time the entity tick method is called and stream-able data is
     * updated.
     * @param {Function=} method The stream control method.
     * @example #Set the entity's stream control method to control when this entity is streamed and when it is not
     *     entity.streamControl(function (clientId) {
     *         // Let's use an example where we only want this entity to stream
     *         // to one particular client with the id 4039589434
     *         if (clientId === '4039589434') {
     *             // Returning true tells the network stream to send data
     *             // about this entity to the client
     *             return true;
     *         } else {
     *             // Returning false tells the network stream NOT to send
     *             // data about this entity to the client
     *             return false;
     *         }
     *     });
     *
     * Further reading: [Controlling Streaming](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/networking-multiplayer/realtime-network-streaming/stream-modes-and-controlling-streaming/)
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	streamControl (method) {
		if (method !== undefined) {
			this._streamControl = method;
			return this;
		}

		return this._streamControl;
	}

	/**
     * Gets / sets the stream sync interval. This value
     * is in milliseconds and cannot be lower than 16. It will
     * determine how often data from this entity is added to the
     * stream queue.
     * @param {Number=} val Number of milliseconds between adding
     * stream data for this entity to the stream queue.
     * @param {String=} sectionId Optional id of the stream data
     * section you want to set the interval for. If omitted the
     * interval will be applied to all sections.
     * @example #Set the entity's stream update (sync) interval to 1 second because this entity's data is not highly important to the simulation so save some bandwidth!
     *     entity.streamSyncInterval(1000);
     * @example #Set the entity's stream update (sync) interval to 16 milliseconds because this entity's data is very important to the simulation so send as often as possible!
     *     entity.streamSyncInterval(16);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	streamSyncInterval (val, sectionId) {
		if (val !== undefined) {
			if (!sectionId) {
				if (val < 16) {
					delete this._streamSyncInterval;
				} else {
					this._streamSyncDelta = 0;
					this._streamSyncInterval = val;
				}
			} else {
				this._streamSyncSectionInterval = this._streamSyncSectionInterval || {};
				this._streamSyncSectionDelta = this._streamSyncSectionDelta || {};
				if (val < 16) {
					delete this._streamSyncSectionInterval[sectionId];
				} else {
					this._streamSyncSectionDelta[sectionId] = 0;
					this._streamSyncSectionInterval[sectionId] = val;
				}
			}
			return this;
		}

		return this._streamSyncInterval;
	}

	/**
     * Gets / sets the precision by which floating-point values will
     * be encoded and sent when packaged into stream data.
     * @param {Number=} val The number of decimal places to preserve.
     * @example #Set the float precision to 2
     *     // This will mean that any data using floating-point values
     *     // that gets sent across the network stream will be rounded
     *     // to 2 decimal places. This helps save bandwidth by not
     *     // having to send the entire number since precision above
     *     // 2 decimal places is usually not that important to the
     *     // simulation.
     *     entity.streamFloatPrecision(2);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
	streamFloatPrecision (val) {
		if (val !== undefined) {
			this._streamFloatPrecision = val;

			let i,
				floatRemove = "\\.";

			// Update the floatRemove regular expression pattern
			for (i = 0; i < this._streamFloatPrecision; i++) {
				floatRemove += "0";
			}

			// Add the trailing comma
			floatRemove += ",";

			// Create the new regexp
			this._floatRemoveRegExp = new RegExp(floatRemove, "g");

			return this;
		}

		return this._streamFloatPrecision;
	}

	/**
     * Queues stream data for this entity to be sent to the
     * specified client id or array of client ids.
     * @param {Array} clientId An array of string IDs of each
     * client to send the stream data to.
     * @return {IgeEntity} "this".
     */
	streamSync (clientId) {
		if (this._streamMode === 1) {
			// Check if we have a stream sync interval
			if (this._streamSyncInterval) {
				this._streamSyncDelta += ige.engine._tickDelta;

				if (this._streamSyncDelta < this._streamSyncInterval) {
					// The stream sync interval is still higher than
					// the stream sync delta so exit without calling the
					// stream sync method
					return this;
				} else {
					// We've reached the delta we want so zero it now
					// ready for the next loop
					this._streamSyncDelta = 0;
				}
			}

			// Grab an array of connected clients from the network
			// system
			let recipientArr = [],
				clientArr = ige.components.network.clients(this._streamRoomId),
				i;

			for (i in clientArr) {
				if (clientArr.hasOwnProperty(i)) {
					// Check for a stream control method
					if (this._streamControl) {
						// Call the callback method and if it returns true,
						// send the stream data to this client
						if (this._streamControl.apply(this, [i, this._streamRoomId])) {
							recipientArr.push(i);
						}
					} else {
						// No control method so process for this client
						recipientArr.push(i);
					}
				}
			}

			this._streamSync(recipientArr);
			return this;
		}

		if (this._streamMode === 2) {
			// Stream mode is advanced
			this._streamSync(clientId, this._streamRoomId);

			return this;
		}

		return this;
	}

	/**
     * Override this method if your entity should send data through to
     * the client when it is being created on the client for the first
     * time through the network stream. The data will be provided as the
     * first argument in the constructor call to the entity class so
     * you should expect to receive it as per this example:
     * @example #Using and Receiving Stream Create Data
     *     class MyNewClass extends IgeEntity {
     *         classId = "MyNewClass";
     *
     *         // Define the init with the parameter to receive the
     *         // data you return in the streamCreateData() method
     *         init = (myCreateData) => {
     *             this._myData = myCreateData;
     *         },
     *
     *         streamCreateData = () => {
     *             return this._myData;
     *         }
     *     });
     *
     * Valid return values must not include circular references!
     */
	streamCreateData () {
	}

	/**
     * Gets / sets the stream emit created flag. If set to true this entity
     * emit a "streamCreated" event when it is created by the stream, but
     * after the id and initial transform are set.
     * @param val
     * @returns {*}
     */
	streamEmitCreated (val) {
		if (val !== undefined) {
			this._streamEmitCreated = val;
			return this;
		}

		return this._streamEmitCreated;
	}

	/**
     * Asks the stream system to queue the stream data to the specified
     * client id or array of ids.
     * @param {Array} recipientArr The array of ids of the client(s) to
     * queue stream data for. The stream data being queued
     * is returned by a call to this._streamData().
     * @param {String} streamRoomId The id of the room the entity belongs
     * in (can be undefined or null if no room assigned).
     * @private
     */
	_streamSync (recipientArr, streamRoomId) {
		let arrCount = recipientArr.length,
			arrIndex,
			clientId,
			{ stream } = ige.components.network,
			thisId = this.id(),
			filteredArr = [],
			createResult = true; // We set this to true by default

		// Loop the recipient array
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			clientId = recipientArr[arrIndex];

			// Check if the client has already received a create
			// command for this entity
			stream._streamClientCreated[thisId] = stream._streamClientCreated[thisId] || {};
			if (!stream._streamClientCreated[thisId][clientId]) {
				createResult = this.streamCreate(clientId);
			}

			// Make sure that if we had to create the entity for
			// this client that the create worked before bothering
			// to waste bandwidth on stream updates
			if (createResult) {
				// Get the stream data
				var data = this._streamData();

				// Is the data different from the last data we sent
				// this client?
				stream._streamClientData[thisId] = stream._streamClientData[thisId] || {};

				if (stream._streamClientData[thisId][clientId] !== data) {
					filteredArr.push(clientId);

					// Store the new data for later comparison
					stream._streamClientData[thisId][clientId] = data;
				}
			}
		}

		if (filteredArr.length) {
			stream.queue(thisId, data, filteredArr);
		}
	}

	/**
     * Forces the stream to push this entity's full stream data on the
     * next stream sync regardless of what clients have received in the
     * past. This should only be used when required rather than every
     * tick as it will reduce the overall efficiency of the stream if
     * used every tick.
     * @returns {*}
     */
	streamForceUpdate () {
		if (ige.isServer) {
			const thisId = this.id();

			// Invalidate the stream client data lookup to ensure
			// the latest data will be pushed on the next stream sync
			if (
				ige.components.network &&
                ige.components.network.stream &&
                ige.components.network.stream._streamClientData &&
                ige.components.network.stream._streamClientData[thisId]
			) {
				ige.components.network.stream._streamClientData[thisId] = {};
			}
		}

		return this;
	}

	/**
     * Issues a create entity command to the passed client id
     * or array of ids. If no id is passed it will issue the
     * command to all connected clients. If using streamMode(1)
     * this method is called automatically.
     * @param {*} clientId The id or array of ids to send
     * the command to.
     * @example #Send a create command for this entity to all clients
     *     entity.streamCreate();
     * @example #Send a create command for this entity to an array of client ids
     *     entity.streamCreate(['43245325', '326755464', '436743453']);
     * @example #Send a create command for this entity to a single client id
     *     entity.streamCreate('43245325');
     * @return {Boolean}
     */
	streamCreate (clientId) {
		if (this._parent) {
			let thisId = this.id(),
				arr,
				i;

			// Send the client an entity create command first
			ige.components.network.send(
				"_igeStreamCreate",
				[this.classId, thisId, this._parent.id(), this.streamSectionData("transform"), this.streamCreateData()],
				clientId
			);

			ige.components.network.stream._streamClientCreated[thisId] = ige.components.network.stream._streamClientCreated[thisId] || {};

			if (clientId) {
				// Mark the client as having received a create
				// command for this entity
				ige.components.network.stream._streamClientCreated[thisId][clientId] = true;
			} else {
				// Mark all clients as having received this create
				arr = ige.components.network.clients();

				for (i in arr) {
					if (arr.hasOwnProperty(i)) {
						ige.components.network.stream._streamClientCreated[thisId][i] = true;
					}
				}
			}

			return true;
		}

		return false;
	}

	/**
     * Issues a destroy entity command to the passed client id
     * or array of ids. If no id is passed it will issue the
     * command to all connected clients. If using streamMode(1)
     * this method is called automatically.
     * @param {*} clientId The id or array of ids to send
     * the command to.
     * @example #Send a destroy command for this entity to all clients
     *     entity.streamDestroy();
     * @example #Send a destroy command for this entity to an array of client ids
     *     entity.streamDestroy(['43245325', '326755464', '436743453']);
     * @example #Send a destroy command for this entity to a single client id
     *     entity.streamDestroy('43245325');
     * @return {Boolean}
     */
	streamDestroy (clientId?: string) {
		let thisId = this.id(),
			arr,
			i;

		// Send clients the stream destroy command for this entity
		ige.components.network.send("_igeStreamDestroy", [ige.engine._currentTime, thisId], clientId);

		ige.components.network.stream._streamClientCreated[thisId] = ige.components.network.stream._streamClientCreated[thisId] || {};
		ige.components.network.stream._streamClientData[thisId] = ige.components.network.stream._streamClientData[thisId] || {};

		if (clientId) {
			// Mark the client as having received a destroy
			// command for this entity
			ige.components.network.stream._streamClientCreated[thisId][clientId] = false;
			ige.components.network.stream._streamClientData[thisId][clientId] = undefined;
		} else {
			// Mark all clients as having received this destroy
			arr = ige.components.network.clients();

			for (i in arr) {
				if (arr.hasOwnProperty(i)) {
					ige.components.network.stream._streamClientCreated[thisId][i] = false;
					ige.components.network.stream._streamClientData[thisId][i] = undefined;
				}
			}
		}

		return true;
	}

	/**
     * Generates and returns the current stream data for this entity. The
     * data will usually include only properties that have changed since
     * the last time the stream data was generated. The returned data is
     * a string that has been compressed in various ways to reduce network
     * overhead during transmission.
     * @return {String} The string representation of the stream data for
     * this entity.
     * @private
     */
	_streamData () {
		// Check if we already have a cached version of the streamData
		if (this._streamDataCache) {
			return this._streamDataCache;
		}

		// Let's generate our stream data
		const sectionArr = this._streamSections;
		const sectionCount = sectionArr.length;

		let streamData = "",
			sectionDataString = "",
			sectionData,
			sectionIndex,
			sectionId;

		// Add the entity id
		streamData += this.id();

		// Only send further data if the entity is still "alive"
		if (this._alive) {
			// Now loop the data sections array and compile the rest of the
			// data string from the data section return data
			for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
				sectionData = "";
				sectionId = sectionArr[sectionIndex];

				// Stream section sync intervals allow individual stream sections
				// to be streamed at different (usually longer) intervals than other
				// sections, so you could for instance reduce the number of updates
				// a particular section sends out in a second because the data is
				// not that important compared to updated transformation data
				if (this._streamSyncSectionInterval && this._streamSyncSectionInterval[sectionId]) {
					// Check if the section interval has been reached
					this._streamSyncSectionDelta[sectionId] += ige.engine._tickDelta;

					if (this._streamSyncSectionDelta[sectionId] >= this._streamSyncSectionInterval[sectionId]) {
						// Get the section data for this section id
						sectionData = this.streamSectionData(sectionId);

						// Reset the section delta
						this._streamSyncSectionDelta[sectionId] = 0;
					}
				} else {
					// Get the section data for this section id
					sectionData = this.streamSectionData(sectionId);
				}

				// Add the section start designator character. We do this
				// regardless of if there is actually any section data because
				// we want to be able to identify sections in a serial fashion
				// on receipt of the data string on the client
				sectionDataString += ige.components.network.stream._sectionDesignator;

				// Check if we were returned any data
				if (sectionData !== undefined) {
					// Add the data to the section string
					sectionDataString += sectionData;
				}
			}

			// Add any custom data to the stream string at this point
			if (sectionDataString) {
				streamData += sectionDataString;
			}

			// Remove any .00 from the string since we don't need that data
			// TODO: What about if a property is a string with something.00 and it should be kept?
			streamData = streamData.replace(this._floatRemoveRegExp, ",");
		}

		// Store the data in cache in case we are asked for it again this tick
		// the update() method of the IgeEntity class clears this every tick
		this._streamDataCache = streamData;
		return streamData;
	}

	/* CEXCLUDE */

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// INTERPOLATOR
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
     * Calculates the current value based on the time along the
     * value range.
     * @param {Number} startValue The value that the interpolation started from.
     * @param {Number} endValue The target value to be interpolated to.
     * @param {Number} startTime The time the interpolation started.
     * @param {Number} currentTime The current time.
     * @param {Number} endTime The time the interpolation will end.
     * @return {Number} The interpolated value.
     */
	interpolateValue (startValue: number, endValue: number, startTime: number, currentTime: number, endTime: number) {
		const totalValue = endValue - startValue;
		const dataDelta = endTime - startTime;
		const offsetDelta = currentTime - startTime;
		let deltaTime = offsetDelta / dataDelta;

		// Clamp the current time from 0 to 1
		if (deltaTime < 0) {
			deltaTime = 0;
		} else if (deltaTime > 1) {
			deltaTime = 1;
		}

		return totalValue * deltaTime + startValue;
	}

	/**
     * Processes the time stream for the entity.
     * @param {Number} renderTime The time that the time stream is
     * targeting to render the entity at.
     * @param {Number} maxLerp The maximum lerp before the value
     * is assigned directly instead of being interpolated.
     * @private
     */
	_processInterpolate (renderTime: number, maxLerp = 200) {
		// Set the maximum lerp to 200 if none is present
		if (!maxLerp) {
			maxLerp = 200;
		}

		//const maxLerpSquared = maxLerp * maxLerp;
		const timeStream = this._timeStream;
		const currentTransform = [];
		let previousData: IgeTimeStreamPacket | undefined,
			nextData: IgeTimeStreamPacket | undefined,
			dataDelta,
			offsetDelta,
			currentTime,
			previousTransform: IgeTimeStreamParsedTransformData,
			nextTransform: IgeTimeStreamParsedTransformData,
			i = 1;

		// Find the point in the time stream that is
		// closest to the render time and assign the
		// previous and next data points
		while (timeStream[i]) {
			if (timeStream[i][0] > renderTime) {
				// We have previous and next data points from the
				// time stream so store them
				previousData = timeStream[i - 1];
				nextData = timeStream[i];
				break;
			}
			i++;
		}

		// Check if we have some data to use
		if (!nextData && !previousData) {
			// No in-time data was found, check for lagging data
			if (timeStream.length > 2) {
				if (timeStream[timeStream.length - 1][0] < renderTime) {
					// Lagging data is available, use that
					previousData = timeStream[timeStream.length - 2];
					nextData = timeStream[timeStream.length - 1];
					timeStream.shift();

					/**
                     * Fires when the entity interpolates against old data, usually
                     * the result of slow processing on the client or too much data
                     * being sent from the server.
                     * @event IgeEntity#interpolationLag
                     */
					this.emit("interpolationLag");
				}
			}
		} else {
			// TODO: Shouldn't we do this if we find old data as well? e.g. timeStream.length > 2
			// We have some new data so clear the old data
			timeStream.splice(0, i - 1);
		}

		// If we have data to use
		if (nextData && previousData) {
			// Check if the previous data has a timestamp and if not,
			// use the next data's timestamp
			if (isNaN(previousData[0])) {
				previousData[0] = nextData[0];
			}

			// Store the data so outside systems can access them
			this._timeStreamPreviousData = previousData;
			this._timeStreamNextData = nextData;

			// Calculate the delta times
			dataDelta = nextData[0] - previousData[0];
			offsetDelta = renderTime - previousData[0];

			this._timeStreamDataDelta = Math.floor(dataDelta);
			this._timeStreamOffsetDelta = Math.floor(offsetDelta);

			// Calculate the current time between the two data points
			currentTime = offsetDelta / dataDelta;

			this._timeStreamCurrentInterpolateTime = currentTime;

			// Clamp the current time from 0 to 1
			//if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }

			// Set variables up to store the previous and next data
			previousTransform = previousData[1].map(parseFloat) as IgeTimeStreamParsedTransformData;
			nextTransform = nextData[1].map(parseFloat) as IgeTimeStreamParsedTransformData;

			// Translate
			currentTransform[0] = this.interpolateValue(previousTransform[0], nextTransform[0], previousData[0], renderTime, nextData[0]);
			currentTransform[1] = this.interpolateValue(previousTransform[1], nextTransform[1], previousData[0], renderTime, nextData[0]);
			currentTransform[2] = this.interpolateValue(previousTransform[2], nextTransform[2], previousData[0], renderTime, nextData[0]);
			// Scale
			currentTransform[3] = this.interpolateValue(previousTransform[3], nextTransform[3], previousData[0], renderTime, nextData[0]);
			currentTransform[4] = this.interpolateValue(previousTransform[4], nextTransform[4], previousData[0], renderTime, nextData[0]);
			currentTransform[5] = this.interpolateValue(previousTransform[5], nextTransform[5], previousData[0], renderTime, nextData[0]);
			// Rotate
			currentTransform[6] = this.interpolateValue(previousTransform[6], nextTransform[6], previousData[0], renderTime, nextData[0]);
			currentTransform[7] = this.interpolateValue(previousTransform[7], nextTransform[7], previousData[0], renderTime, nextData[0]);
			currentTransform[8] = this.interpolateValue(previousTransform[8], nextTransform[8], previousData[0], renderTime, nextData[0]);

			this.translateTo(currentTransform[0], currentTransform[1], currentTransform[2]);
			this.scaleTo(currentTransform[3], currentTransform[4], currentTransform[5]);
			this.rotateTo(currentTransform[6], currentTransform[7], currentTransform[8]);

			// Record the last time we updated the entity, so we can disregard any updates
			// that arrive and are before this timestamp (not applicable in TCP but will
			// apply if we ever get UDP in websockets)
			this._lastUpdate = new Date().getTime();
		}
	}

	_highlightToGlobalCompositeOperation (val: boolean): string | undefined {
		if (val) {
			return "lighter";
		}
	}
}

export default IgeEntity;
