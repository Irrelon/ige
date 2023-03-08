import IgeEventingClass from "./IgeEventingClass";
import { IgeRegisterableById } from "../../types/IgeRegisterableById";
import { IgeRegisterableByCategory } from "../../types/IgeRegisterableByCategory";
import { ige } from "../instance";
import { arrPull, newIdHex } from "../services/utils";
import IgeTileMap2d from "./IgeTileMap2d";
import { IgeTimeStreamPacket } from "../../types/IgeTimeStream";
import { isClient, isServer } from "../services/clientServer";
import { IgeNetIoClientComponent } from "../components/network/net.io/IgeNetIoClientComponent";
import { IgeNetIoServerComponent } from "../components/network/net.io/IgeNetIoServerComponent";
import IgePoint3d from "./IgePoint3d";
import IgePoint2d from "./IgePoint2d";
import { IgeInputEventControl } from "../components/IgeInputComponent";
import IgeMatrix2d from "./IgeMatrix2d";
import IgeDummyContext from "./IgeDummyContext";
import IgeDummyCanvas from "./IgeDummyCanvas";
import IgeRect from "./IgeRect";
import IgeTexture from "./IgeTexture";
import { IgeSmartTexture } from "../../types/IgeSmartTexture";
import IgePoly2d from "./IgePoly2d";
import { IgeEntityBehaviour } from "./IgeEntity";
import { IgeDepthSortObject } from "../../types/IgeDepthSortObject";

export class IgeObject extends IgeEventingClass implements IgeRegisterableById, IgeRegisterableByCategory {
	classId = "IgeObject";
	_id?: string;
	_idRegistered: boolean = false;
	_categoryRegistered: boolean = false;
	_category: string = "";
	_drawBounds: boolean = false;
	_drawBoundsData: boolean = false;
	_drawMouse: boolean = false;
	_drawMouseData: boolean = false;
	_ignoreCamera: boolean = false;
	_parent: IgeObject | null = null;
	_children: IgeObject[] = [];
	_transformChanged: boolean = false;

	_specialProp: string[] = [];
	_streamMode?: number;
	_streamRoomId?: string;
	_streamDataCache: string = "";
	_streamJustCreated?: boolean;
	_streamEmitCreated?: boolean;
	_streamSections: string[] = [];
	_streamSyncInterval?: number;
	_streamSyncDelta: number = 0;
	_streamSyncSectionInterval: Record<string, number> = {}; // Holds minimum delta before the stream section is included in the next stream data packet
	_streamSyncSectionDelta: Record<string, number> = {}; // Stores the game time elapsed since the last time the section was included in a stream data packet
	_timeStreamCurrentInterpolateTime?: number;
	_timeStreamDataDelta?: number;
	_timeStreamOffsetDelta?: number;
	_timeStreamPreviousData?: IgeTimeStreamPacket;
	_timeStreamNextData?: IgeTimeStreamPacket;
	_streamFloatPrecision: number = 2;
	_floatRemoveRegExp: RegExp = new RegExp("\\.00,", "g");
	_compositeStream: boolean = false;
	_disableInterpolation: boolean = false;
	_streamControl?: (clientId: string, roomId?: string) => boolean;
	_newBorn = true;
	_alive = true;
	_mode = 0;
	_mountMode = 0;
	_layer = 0;
	_depth = 0;
	_depthSortMode = 0;
	_timeStream: IgeTimeStreamPacket[] = [];
	_inView = true;
	_managed = 1;
	_triggerPolygon?: "aabb" | "localBounds3dPolygon";
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
	_mouseStateDown: boolean = false;
	_mouseStateOver: boolean = false;
	_mouseAlwaysInside: boolean = false;
	_mouseOut?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
	_mouseOver?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
	_mouseMove?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
	_mouseWheel?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
	_mouseUp?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
	_mouseDown?: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
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
	_aabb: IgeRect = new IgeRect();
	_compositeAabbCache?: IgeRect;
	_noAabb?: boolean;
	_hasParent?: Record<string, boolean>;
	_texture?: IgeTexture;
	_indestructible: boolean = false;
	_shouldRender?: boolean = true;
	_smartBackground?: IgeSmartTexture;
	_lastUpdate?: number;
	_tickBehaviours?: IgeEntityBehaviour[];
	_updateBehaviours?: IgeEntityBehaviour[];
	_birthMount?: string;
	_frameAlternatorCurrent: boolean = false;
	_backgroundPattern?: IgeTexture;
	_backgroundPatternRepeat?: string;
	_backgroundPatternTrackCamera?: boolean;
	_backgroundPatternIsoTile?: boolean;
	_backgroundPatternFill?: CanvasPattern | null;
	_bounds3dPolygonDirty: boolean = false;
	_localBounds3dPolygon?: IgePoly2d;
	_bounds3dPolygon?: IgePoly2d;
	_localAabb?: IgeRect;
	_deathCallBack?: (...args: any[]) => void; // TODO: Rename this to _deathCallback (lower case B)
	_sortChildren: ((comparatorFunction: (a: IgeObject, b: IgeObject) => number) => void) = (compareFn) => {
		return this._children.sort(compareFn);
	};

	constructor () {
		super();

		this._specialProp.push('_id');
		this._specialProp.push('_parent');
		this._specialProp.push('_children');

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
	id(id: string): this;
	id(): string;
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
	category (val: string): this;
	category (): string;
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
			ige.categoryRegister.add(this);
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

	update (ctx: CanvasRenderingContext2D, tickDelta: number) {
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

	tick (ctx: CanvasRenderingContext2D) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		if (ige.config.debug._timing) {
			while (arrCount--) {
				if (!arr[arrCount]) {
					this.log("Object _children is undefined for index " + arrCount + " and _id: " + this._id, "error");
					continue;
				}

				if (!arr[arrCount]._newBorn) {
					ctx.save();

					const ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					const td = new Date().getTime() - ts;

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

	updateTransform () {}

	aabb (recalculate = true, inverse = false): IgeRect {
		return this._aabb;
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
	parent(): IgeObject | IgeTileMap2d | null | undefined;
	parent(id: string): IgeObject | null;
	parent (id?: string): IgeObject | IgeTileMap2d | null {
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
	mount (obj: IgeObject): this {
		if (obj === this) {
			this.log("Cannot mount an object to itself!", "error");
			return this;
		}

		if (!obj._children) {
			// The object has no _children array!
			throw new Error(
				"Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have extended from IgeObject."
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
	 * Override the _childMounted method and apply entity-based flags.
	 * @param {IgeEntity} child
	 * @private
	 */
	_childMounted (child: IgeObject) {
		// Check if we need to set the compositeStream and streamMode
		if (this.compositeStream()) {
			child.compositeStream(true);
			child.streamMode(this.streamMode());
			child.streamControl(this.streamControl());
		}

		this._resizeEvent();

		// Check if we are compositeCached and update the cache
		if (this.compositeCache()) {
			this.cacheDirty(true);
		}
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
	alive(val: boolean): this;
	alive(): boolean;
	alive (val?: boolean) {
		if (val !== undefined) {
			this._alive = val;
			return this;
		}

		return this._alive;
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
		if (!isClient) {
			return this;
		}

		if (val === undefined) {
			return this._compositeCache;
		}

		if (val) {
			// Switch off normal caching
			this.cache(false);

			// Create the off-screen canvas
			const canvasObj = ige.engine.createCanvas({ smoothing: this._cacheSmoothing, pixelRatioScaling: true });
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
	cacheDirty (val: boolean): this;
	cacheDirty (): boolean;
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

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// STREAM
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Gets / sets the disable interpolation flag. If set to true then
	 * stream data being received by the client will not be interpolated
	 * and will be instantly assigned instead. Useful if your entity's
	 * transformations should not be interpolated over time.
	 * @param val
	 * @returns {*}
	 */
	disableInterpolation (val?: boolean) {
		if (val !== undefined) {
			this._disableInterpolation = val;
			return this;
		}

		return this._disableInterpolation;
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
	compositeStream (val: boolean): this;
	compositeStream (): boolean;
	compositeStream (val?: boolean) {
		if (val !== undefined) {
			this._compositeStream = val;
			return this;
		}

		return this._compositeStream;
	}

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
	streamSectionData (sectionId: string, data?: string, bypassTimeStream: boolean = false) {
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
					const network = (ige.network as IgeNetIoClientComponent);
					this._timeStream.push([network._streamDataTime + network._latency, dataArr]);

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
				if (isClient) {
					this.depth(parseInt(data));
				}
			} else {
				return String(this.depth());
			}
			break;

		case "layer":
			if (data !== undefined) {
				if (isClient) {
					this.layer(parseInt(data));
				}
			} else {
				return String(this.layer());
			}
			break;

		case "bounds2d":
			if (data !== undefined) {
				if (isClient) {
					var geom = data.split(",");
					this.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
				}
			} else {
				return String(this._bounds2d.x + "," + this._bounds2d.y);
			}
			break;

		case "bounds3d":
			if (data !== undefined) {
				if (isClient) {
					var geom = data.split(",");
					this.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
				}
			} else {
				return String(this._bounds3d.x + "," + this._bounds3d.y + "," + this._bounds3d.z);
			}
			break;

		case "hidden":
			if (data !== undefined) {
				if (isClient) {
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
				if (isClient) {
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
				if (isClient) {
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
				if (isClient) {
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
	streamMode(val: number): this;
	streamMode(): number;
	streamMode (val?: number) {
		if (val !== undefined) {
			if (isServer) {
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
	streamControl (method: (clientId: string, roomId?: string) => boolean): this;
	streamControl (): (clientId: string, roomId?: string) => boolean;
	streamControl (method?: (clientId: string, roomId?: string) => boolean) {
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
	 * @param {Array} clientIds An array of string IDs of each
	 * client to send the stream data to.
	 * @return {IgeEntity} "this".
	 */
	streamSync (clientIds?: string[]) {
		if (this._streamMode === 1) {
			// In stream mode 1, the streamSync function will not
			// be called with `clientIds` so we don't use that in this
			// block of code

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

			// Grab an array of connected clients from the network system
			const recipientArr: string[] = [];
			const clientsById = (ige.network as IgeNetIoServerComponent).clients(this._streamRoomId);

			Object.keys(clientsById).forEach((clientId) => {
				// Check for a stream control method
				if (this._streamControl) {
					// Call the callback method and if it returns true,
					// send the stream data to this client
					if (this._streamControl(clientId, this._streamRoomId)) {
						recipientArr.push(clientId);
					}
				} else {
					// No control method so process for this client
					recipientArr.push(clientId);
				}
			})

			this._streamSync(recipientArr);
			return this;
		}

		if (this._streamMode === 2) {
			// Stream mode is advanced
			this._streamSync(clientIds, this._streamRoomId);

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
	streamEmitCreated (val?: boolean) {
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
	_streamSync (recipientArr: string[] = [], streamRoomId?: string) {
		const arrCount = recipientArr.length;
		const thisId = this.id();
		const filteredArr: string[] = [];
		const network = ige.network as IgeNetIoServerComponent;

		let createResult = true; // We set this to true by default
		let data = "";

		// Loop the recipient array
		for (let arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			const clientId = recipientArr[arrIndex];

			// Check if the client has already received a create
			// command for this entity
			network._streamClientCreated[thisId] = network._streamClientCreated[thisId] || {};
			if (!network._streamClientCreated[thisId][clientId]) {
				createResult = this.streamCreate(clientId);
			}

			// Make sure that if we had to create the entity for
			// this client that the operation worked before bothering
			// to waste bandwidth on stream updates
			if (createResult) {
				// Get the stream data
				data = this._streamData();

				// Is the data different from the last data we sent
				// this client?
				network._streamClientData[thisId] = network._streamClientData[thisId] || {};

				if (network._streamClientData[thisId][clientId] !== data) {
					filteredArr.push(clientId);

					// Store the new data for later comparison
					network._streamClientData[thisId][clientId] = data;
				}
			}
		}

		if (filteredArr.length) {
			network.queue(thisId, data, filteredArr);
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
		const thisId = this.id();
		const network = ige.network as IgeNetIoServerComponent;

		// Invalidate the stream client data lookup to ensure
		// the latest data will be pushed on the next stream sync
		if (
			network &&
			network._streamClientData &&
			network._streamClientData[thisId]
		) {
			network._streamClientData[thisId] = {};
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
	streamCreate (clientId: string) {
		if (!this._parent) {
			return false;
		}

		const thisId = this.id();
		const network = ige.network as IgeNetIoServerComponent;

		// Send the client an entity create command first
		network.send(
			"_igeStreamCreate",
			[this.classId, thisId, this._parent.id(), this.streamSectionData("transform"), this.streamCreateData()],
			clientId
		);

		network._streamClientCreated[thisId] = network._streamClientCreated[thisId] || {};

		if (clientId) {
			// Mark the client as having received a create
			// command for this entity
			network._streamClientCreated[thisId][clientId] = true;
		} else {
			// Mark all clients as having received this create
			const clientsById = network.clients();

			Object.keys(clientsById).forEach((tmpClientId) => {
				network._streamClientCreated[thisId][tmpClientId] = true;
			});
		}

		return true;
	}

	/**
	 * Issues a `destroy entity` command to the passed client id
	 * or array of ids. If no id is passed it will issue the
	 * command to all connected clients. If using streamMode(1)
	 * this method is called automatically.
	 * @param {*} clientId The id or array of ids to send
	 * the command to.
	 * @example #Send a destroy command for this entity to all clients.
	 *     entity.streamDestroy();
	 * @example #Send a destroy command for this entity to an array of client ids.
	 *     entity.streamDestroy(['43245325', '326755464', '436743453']);
	 * @example #Send a destroy command for this entity to a single client id.
	 *     entity.streamDestroy('43245325');
	 * @return {Boolean}
	 */
	streamDestroy (clientId?: string) {
		const thisId = this.id();
		const network = ige.network as IgeNetIoServerComponent;

		// Send clients the stream destroy command for this entity
		network.send("_igeStreamDestroy", [ige.engine._currentTime, thisId], clientId);

		network._streamClientCreated[thisId] = network._streamClientCreated[thisId] || {};
		network._streamClientData[thisId] = network._streamClientData[thisId] || {};

		if (clientId) {
			// Mark the client as having received a destroy
			// command for this entity
			network._streamClientCreated[thisId][clientId] = false;
			network._streamClientData[thisId][clientId] = "";
			return true;
		}

		// Mark all clients as having received this destroy
		const clientsById = network.clients();

		Object.keys(clientsById).forEach((tmpClientId) => {
			network._streamClientCreated[thisId][tmpClientId] = false;
			network._streamClientData[thisId][tmpClientId] = "";
		});

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
				sectionDataString += (ige.network as IgeNetIoServerComponent)._sectionDesignator;

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
}