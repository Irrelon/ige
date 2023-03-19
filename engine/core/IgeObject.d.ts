import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeMatrix2d } from "@/engine/core/IgeMatrix2d";
import { IgeDummyCanvas } from "@/engine/core/IgeDummyCanvas";
import { IgeRect } from "@/engine/core/IgeRect";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgePoly2d } from "@/engine/core/IgePoly2d";
import { IgeMountMode } from "@/enums/IgeMountMode";
import { IgeStreamMode } from "@/enums/IgeStreamMode";
import { IgeIsometricDepthSortMode } from "@/enums/IgeIsometricDepthSortMode";
import type { IgeTimeStreamPacket } from "@/types/IgeTimeStream";
import type { IgeCanRegisterById } from "@/types/IgeCanRegisterById";
import type { IgeCanRegisterByCategory } from "@/types/IgeCanRegisterByCategory";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";
import type { IgeDepthSortObject } from "@/types/IgeDepthSortObject";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeChildSortFunction } from "@/types/IgeChildSortFunction";
import { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import { IgeInputEvent } from "@/types/IgeInputEvent";
import { IgePoint } from "@/types/IgePoint";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeCanAcceptComponents } from "@/types/IgeCanAcceptComponents";
import { IgeComponent } from "@/engine/core/IgeComponent";
import { IgeBehaviourStore } from "@/types/IgeBehaviourStore";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
export declare class IgeObject extends IgeEventingClass implements IgeCanRegisterById, IgeCanRegisterByCategory, IgeCanAcceptComponents {
    classId: string;
    _id?: string;
    _idRegistered: boolean;
    _categoryRegistered: boolean;
    _category: string;
    _drawBounds: boolean;
    _drawBoundsData: boolean;
    _drawMouse: boolean;
    _drawMouseData: boolean;
    _ignoreCamera: boolean;
    _parent: IgeObject | null;
    _children: IgeObject[];
    _transformChanged: boolean;
    _tileWidth: number;
    _tileHeight: number;
    _specialProp: string[];
    _streamMode?: IgeStreamMode;
    _streamRoomId?: string;
    _streamDataCache: string;
    _streamJustCreated?: boolean;
    _streamEmitCreated?: boolean;
    _streamSections: string[];
    _streamProperty: Record<string, any>;
    _streamSyncInterval?: number;
    _streamSyncDelta: number;
    _streamSyncSectionInterval: Record<string, number>;
    _streamSyncSectionDelta: Record<string, number>;
    _timeStreamCurrentInterpolateTime?: number;
    _timeStreamDataDelta?: number;
    _timeStreamOffsetDelta?: number;
    _timeStreamPreviousData?: IgeTimeStreamPacket;
    _timeStreamNextData?: IgeTimeStreamPacket;
    _timeStream: IgeTimeStreamPacket[];
    _streamFloatPrecision: number;
    _floatRemoveRegExp: RegExp;
    _compositeStream: boolean;
    _disableInterpolation: boolean;
    _streamControl?: (clientId: string, roomId?: string) => boolean;
    _newBorn: boolean;
    _alive: boolean;
    _mountMode: IgeMountMode;
    _layer: number;
    _depth: number;
    _depthSortMode: IgeIsometricDepthSortMode;
    _inView: boolean;
    _managed: number;
    _triggerPolygon?: "aabb" | "localBounds3dPolygon";
    _compositeCache: boolean;
    _compositeParent: boolean;
    _anchor: IgePoint2d;
    _renderPos: {
        x: number;
        y: number;
    };
    _computedOpacity: number;
    _opacity: number;
    _cell: number | null;
    _deathTime?: number;
    _bornTime: number;
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
    _pointerEventsActive: boolean;
    _pointerStateDown: boolean;
    _pointerStateOver: boolean;
    _pointerAlwaysInside: boolean;
    _pointerOut?: IgeInputEvent;
    _pointerOver?: IgeInputEvent;
    _pointerMove?: IgeInputEvent;
    _pointerWheel?: IgeInputEvent;
    _pointerUp?: IgeInputEvent;
    _pointerDown?: IgeInputEvent;
    _velocity: IgePoint3d;
    _localMatrix: IgeMatrix2d;
    _worldMatrix: IgeMatrix2d;
    _oldWorldMatrix: IgeMatrix2d;
    _adjustmentMatrix: IgeMatrix2d;
    _hidden: boolean;
    _cache: boolean;
    _cacheCtx?: IgeCanvasRenderingContext2d | null;
    _cacheCanvas?: HTMLCanvasElement | IgeDummyCanvas;
    _cacheDirty: boolean;
    _cacheSmoothing: boolean;
    _aabbDirty: boolean;
    _aabb: IgeRect;
    _compositeAabbCache?: IgeRect;
    _noAabb?: boolean;
    _hasParent?: Record<string, boolean>;
    _texture?: IgeTexture;
    _indestructible: boolean;
    _shouldRender?: boolean;
    _smartBackground?: IgeSmartTexture;
    _lastUpdate?: number;
    _behaviours?: IgeBehaviourStore;
    _birthMount?: string;
    _frameAlternatorCurrent: boolean;
    _backgroundPattern?: IgeTexture;
    _backgroundPatternRepeat: string | null;
    _backgroundPatternTrackCamera?: boolean;
    _backgroundPatternIsoTile?: boolean;
    _backgroundPatternFill?: CanvasPattern | null;
    _bounds3dPolygonDirty: boolean;
    _localBounds3dPolygon?: IgePoly2d;
    _bounds3dPolygon?: IgePoly2d;
    _localAabb?: IgeRect;
    _deathCallBack?: (...args: any[]) => void;
    components: Record<string, IgeComponent>;
    constructor();
    _sortChildren: (IgeChildSortFunction);
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
    category(val: string): this;
    category(): string;
    /**
     * Gets / sets the boolean flag determining if this object should have
     * its bounds drawn when the bounds for all objects are being drawn.
     * In order for bounds to be drawn the viewport the object is being drawn
     * to must also have draw bounds enabled.
     * @example #Enable draw bounds
     *     var entity = new IgeEntity();
     *     entity.drawBounds(true);
     * @example #Disable draw bounds
     *     var entity = new IgeEntity();
     *     entity.drawBounds(false);
     * @example #Get the current flag value
     *     console.log(entity.drawBounds());
     * @return {*}
     * @param id
     */
    drawBounds(id: boolean): this;
    drawBounds(): boolean;
    /**
     * Gets / sets the boolean flag determining if this object should have
     * its bounds data drawn when the bounds for all objects are being drawn.
     * Bounds data includes the object ID and its current depth etc.
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
    /**
     * Gets / sets the boolean flag determining if this object should have
     * its mouse position drawn, usually for debug purposes.
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
    /**
     * Gets / sets the boolean flag determining if this object should have
     * its extra mouse data drawn for debug purposes. For instance, on tile maps
     * (IgeTileMap2d) instances, when enabled you will see the tile x and y
     * co-ordinates currently being hovered over by the mouse.
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
    /**
     * Returns the absolute world position of the entity as an
     * IgePoint3d.
     * @example #Get the world position of the entity
     *     var wordPos = entity.worldPosition();
     * @return {IgePoint3d} The absolute world position of the
     * entity.
     */
    worldPosition(): IgePoint3d;
    /**
     * Returns the absolute world rotation z of the entity as a
     * value in radians.
     * @example #Get the world rotation of the entity's z axis
     *     var wordRot = entity.worldRotationZ();
     * @return {Number} The absolute world rotation z of the
     * entity.
     */
    worldRotationZ(): number;
    /**
     * Converts an array of points from local space to this entity's
     * world space using its world transform matrix. This will alter
     * the points passed in the array directly.
     * @param {Array} points The array of IgePoints to convert.
     * @param viewport
     * @param inverse
     */
    localToWorld(points: IgePoint[], viewport?: IgeViewport | null, inverse?: boolean): void;
    /**
     * Converts a point from local space to this entity's world space
     * using its world transform matrix. This will alter the point's
     * data directly.
     * @param {IgePoint3d} point The IgePoint3d to convert.
     * @param viewport
     */
    localToWorldPoint(point: IgePoint3d, viewport?: IgeViewport | null): void;
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
    screenPosition(): IgePoint3d;
    /**
     * @deprecated Use bounds3dPolygon instead
     */
    localIsoBoundsPoly(): void;
    localBounds3dPolygon(recalculate?: boolean): IgePoly2d;
    bounds3dPolygon(recalculate?: boolean): IgePoly2d;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    tick(ctx: IgeCanvasRenderingContext2d): void;
    updateTransform(): void;
    aabb(recalculate?: boolean, inverse?: boolean): IgeRect;
    /**
     * Calls each behaviour method for the object.
     */
    _processBehaviours(type: IgeBehaviourType, ...args: any[]): void;
    /**
     * Returns the object's parent object (the object that
     * it is mounted to).
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
    children(): IgeObject[];
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
    mount(obj: IgeObject): this;
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
    unMount(): false | this;
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
    hasParent(parentId: string, fresh?: boolean): boolean;
    /**
     * Override the _childMounted method and apply entity-based flags.
     * @param {IgeEntity} child
     * @private
     */
    _childMounted(child: IgeObject): void;
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
    /**
     * Gets / sets the indestructible flag. If set to true, the object will
     * not be destroyed even if a call to destroy() method is made.
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
    /**
     * Gets / sets the current entity layer. This affects how the entity is depth-sorted
     * against other entities of the same parent. Please note that entities are first sorted
     * by their layer and then by their depth, and only entities of the same layer will be
     * sorted against each other by their depth values.
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
    /**
     * Gets / sets the current render depth of the object (higher depths
     * are drawn over lower depths). Please note that entities are first sorted
     * by their layer and then by their depth, and only entities of the same layer will be
     * sorted against each other by their depth values.
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
    /**
     * Loops through all child objects of this object and destroys them
     * by calling each child's destroy() method then clears the object's
     * internal _children array.
     */
    destroyChildren(): this;
    /**
     * Gets / sets if objects mounted to this object should be positioned
     * and depth-sorted in an isometric fashion or a 2d fashion.
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
    /**
     * Gets / sets the depth sort mode that is used when
     * depth sorting this object's children against each other. This
     * mode only applies if this object's mount mode is isometric,
     * as set by calling isometricMounts(true). If the mount mode is
     * 2d, the depth sorter will use a very fast 2d depth sort that
     * does not use 3d bounds at all.
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
    depthSortMode(): IgeIsometricDepthSortMode;
    depthSortMode(val: IgeIsometricDepthSortMode): this;
    /**
     * Sorts the _children array by the layer and then depth of each object.
     */
    depthSortChildren(): void;
    _depthSortVisit(u: number, sortObj: IgeDepthSortObject): void;
    /**
     * Handles screen resize events. Calls the _resizeEvent method of
     * every child object mounted to this object.
     * @param event
     * @private
     */
    _resizeEvent(event?: Event): void;
    /**
     * Called when a child object is un-mounted from this object.
     * @param obj
     * @private
     */
    _childUnMounted(obj: IgeObject): void;
    /**
     * Called when this object is mounted to an object.
     * @param obj
     * @private
     */
    _mounted(obj: IgeObject): void;
    /**
     * Called when this object is un-mounted from its parent.
     * @param obj
     * @private
     */
    _unMounted(obj: IgeObject): void;
    isMounted(): boolean;
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
    childSortingAlgorithm(val: IgeChildSortFunction): this;
    childSortingAlgorithm(): IgeChildSortFunction;
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
     */
    _transformPoint(point: IgePoint3d): IgePoint3d;
    /**
     * Adds a behaviour to the object's active behaviour list.
     * @param type
     * @param {String} id
     * @param {Function} behaviour
     * during the tick() method instead of the update() method.
     * @example #Add a behaviour with the id "myBehaviour"
     *     var entity = new IgeEntity();
     *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
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
    addBehaviour<ParentType extends IgeObject = IgeObject>(type: IgeBehaviourType, id: string, behaviour: IgeEntityBehaviourMethod<ParentType>): this;
    /**
     * Removes a behaviour to the object's active behaviour list by its id.
     * @param type
     * @param {String} id
     * @example #Remove a behaviour with the id "myBehaviour"
     *     var entity = new IgeEntity();
     *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
     *         // Code here will execute during each engine update for
     *         // this entity. I can access the entity via the "this"
     *         // keyword such as:
     *         this._somePropertyOfTheEntity = 'moo';
     *     });
     *
     *     // Now remove the "myBehaviour" behaviour
     *     entity.removeBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour');
     * @return {*} Returns this on success or false on failure.
     */
    removeBehaviour(type: IgeBehaviourType, id: string): this | undefined;
    /**
     * Checks if the object has the specified behaviour already added to it.
     * @param type
     * @param {String} id
     * from the tick method rather than the update method.
     * @example #Check for a behaviour with the id "myBehaviour"
     *     var entity = new IgeEntity();
     *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
     *         // Code here will execute during each engine update for
     *         // this entity. I can access the entity via the "this"
     *         // keyword such as:
     *         this._somePropertyOfTheEntity = 'moo';
     *     });
     *
     *     // Now check for the "myBehaviour" behaviour
     *     console.log(entity.hasBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour')); // Will log "true"
     * @return {*} Returns this on success or false on failure.
     */
    hasBehaviour(type: IgeBehaviourType, id: string): boolean;
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
    cache(val?: boolean, propagateToChildren?: boolean): boolean | this;
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
    compositeCache(val?: boolean, propagateToChildren?: boolean): boolean | this;
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
    cacheDirty(val: boolean): this;
    cacheDirty(): boolean;
    registerNetworkClass(): void;
    /**
     * Gets / sets the `disable interpolation` flag. If set to true then
     * stream data being received by the client will not be interpolated
     * and will be instantly assigned instead. Useful if your entity's
     * transformations should not be interpolated over time.
     * @param val
     * @returns {*}
     */
    disableInterpolation(val?: boolean): boolean | this;
    /**
     * Gets / sets the composite stream flag. If set to true, any objects
     * mounted to this one will have their streamMode() set to the same
     * value as this entity and will also have their compositeStream flag
     * set to true. This allows you to easily automatically stream any
     * objects mounted to a root object and stream them all.
     * @param val
     * @returns {*}
     */
    compositeStream(val: boolean): this;
    compositeStream(): boolean;
    /**
     * Gets / sets the array of sections that this entity will
     * encode into its stream data.
     * @param {Array=} sectionArray An array of strings.
     * @example #Define the sections this entity will use in the network stream. Use the default "transform" section as well as a "custom1" section
     *     entity.streamSections('transform', 'custom1');
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    streamSections(sectionArray?: string[]): this | string[];
    /**
     * Adds a section into the existing streamed sections array.
     * @param {String} sectionName The section name to add.
     */
    streamSectionsPush(sectionName: string): this;
    /**
     * Removes a section into the existing streamed sections array.
     * @param {String} sectionName The section name to remove.
     */
    streamSectionsPull(sectionName: string): this;
    /**
     * Gets / sets a streaming property on this entity. If set, the
     * property's new value is streamed to clients on the next packet.
     * Stream properties only work if you specify "props" as a stream
     * section via `streamSectionsPush("props");` or
     * `streamSections("transform", "props");`.
     *
     * @param {String} propName The name of the property to get / set.
     * @param {*=} propVal Optional. If provided, the property is set
     * to this value.
     * @return {*} "this" when a propVal argument is passed to allow method
     * chaining or the current value if no propVal argument is specified.
     */
    streamProperty(propName: string, propVal?: any): any;
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
    streamMode(val: IgeStreamMode): this;
    streamMode(): IgeStreamMode;
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
    streamControl(method: (clientId: string, roomId?: string) => boolean): this;
    streamControl(): (clientId: string, roomId?: string) => boolean;
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
    streamSyncInterval(val?: number, sectionId?: string): number | this | undefined;
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
    streamFloatPrecision(val?: number): number | this;
    /**
     * Queues stream data for this entity to be sent to the
     * specified client id or array of client ids.
     * @param {Array} clientIds An array of string IDs of each
     * client to send the stream data to.
     * @return {IgeEntity} "this".
     */
    streamSync(clientIds?: string[]): this;
    /**
     * Override this method if your entity should send arguments through to
     * the client when it is being created on the client for the first
     * time through the network stream. The array will be spread to the
     * constructor call, so you should expect to receive it as per this example:
     * @renamed This used to be called streamCreateData.
     * @example #Using and Receiving Stream Create Constructor Arguments
     *     class MyNewClass extends IgeEntity {
     *         classId = "MyNewClass";
     *
     *         // Define the constructor with the parameter to receive the
     *         // data you return from the streamCreateConstructorArgs() method
     *         constructor (myFirstArg, mySecondArg) => {
     *         	   super();
     *             this._myData1 = myFirstArg;
     *             this._myData2 = mySecondArg;
     *         }
     *
     *         streamCreateConstructorArgs () {
     *             return [this._myData1, this._myData2];
     *         }
     *     });
     *
     * Valid return values must not include circular references and must be
     * serialisable via JSON.stringify(). If you want to pass in instances
     * of things to a constructor, modify the constructor to take the id of
     * the instance and then do a lookup so that you can still pass the id via
     * the network.
     */
    streamCreateConstructorArgs(): any[] | undefined;
    /**
     * Override this method if your entity should send arbitrary data through
     * to the client when it is being created on the client for the first
     * time through the network stream. The array will be received on the
     * client via the `onStreamCreateInitialData()` event handler directly after
     * being instantiated. The data is wrapped into the initial `_igeStreamCreate`
     * network message sent from the server so the order of execution on receipt
     * is:
     *
     * 		constructor()
     * 		id()
     * 		mount()
     * 		set transform (translate, rotate and scale)
     * 		onStreamCreateInitialData()
     *
     * This means that the data that you have passed will have been provided to
     * the `onStreamCreateInitialData()` before any subsequent code executes, as
     * long as that code is outside the constructor and not related to setting
     * the id, mounting or setting the initial transform of your class instance.
     *
     * If you need to execute a function in the constructor that relies on this
     * arbitrary data, you should place it in a setTimeout so that the data has
     * time to be assigned, or call it inside the `onStreamCreateInitialData()`
     * function after you have dealt with the incoming data.
     *
     * You should expect to receive this data as per this example:
     * @example #Using and Receiving Stream Create Initial Props
     *     class MyNewClass extends IgeEntity {
     *         classId = "MyNewClass";
     *
     *         constructor () {
     *         	   // This is set on the server-side
     *             this._brand = "awesomeBrand";
     *             this._color = "amazingColor";
     *         }
     *
     *         streamCreateInitialData () {
     *         	   // This is called on the server-side
     *             return [this._brand, this._color];
     *         }
     *
     *         onStreamCreateInitialData = (data) => {
     *         		// This is received on the client-side
     *         		this._brand = data[0]; // Will be "awesomeBrand"
     *         		this._color = data[1]; // Will be "amazingColor"
     *         }
     *     });
     *
     * Valid return values must not include circular references and must be
     * serialisable via JSON.stringify(). If you want to pass in instances
     * of things to a constructor, modify the constructor to take the id of
     * the instance and then do a lookup so that you can still pass the id via
     * the network.
     */
    streamCreateInitialData(): any;
    onStreamCreateInitialData(data: any): void;
    /**
     * Gets / sets the stream emit created flag. If set to true this entity
     * emit a "streamCreated" event when it is created by the stream, but
     * after the id and initial transform are set.
     * @param val
     * @returns {*}
     */
    streamEmitCreated(val?: boolean): boolean | this | undefined;
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
    _streamSync(recipientArr?: string[], streamRoomId?: string): void;
    /**
     * Forces the stream to push this entity's full stream data on the
     * next stream sync regardless of what clients have received in the
     * past. This should only be used when required rather than every
     * tick as it will reduce the overall efficiency of the stream if
     * used every tick.
     * @returns {*}
     */
    streamForceUpdate(): this;
    /**
     * Issues a create entity command to the passed client id
     * or array of ids. If no id is passed it will issue the
     * command to all connected clients. If using streamMode(1)
     * this method is called automatically.
     * @param {*} clientId The id or array of ids to send
     * the command to.
     * @renamed Was called streamCreate.
     * @example #Send a create command for this entity to all clients.
     *     entity.sendStreamCreate();
     * @example #Send a create command for this entity to an array of client ids
     *     entity.sendStreamCreate(['43245325', '326755464', '436743453']);
     * @example #Send a create command for this entity to a single client id
     *     entity.sendStreamCreate('43245325');
     * @return {Boolean}
     */
    sendStreamCreate(clientId?: string | string[]): boolean;
    /**
     * Gets / sets the data for the specified data section id. This method
     * is usually not called directly and instead is part of the network
     * stream system. General use case is to write your own custom streamSectionData
     * method in a class that extends IgeEntity so that you can control the
     * data that the entity will send and receive over the network stream.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {*=} data If present, this is the data that has been sent
     * from the server to the client for this entity. If not present then
     * we should return the data to be sent over the network.
     * @param {Boolean=} bypassTimeStream If true, will assign transform
     * directly to entity instead of adding the values to the time stream.
     * @param {Boolean=} bypassChangeDetection If set to true, bypasses
     * any change detection on stream data (useful especially when we are
     * sending stream data to a client for the first time even if the data
     * has existed on the server for a while - ensuring that even unchanged
     * data makes it to the new client).
     * @return {*} "this" when a data argument is passed to allow method
     * chaining or the current value if no data argument is specified.
     */
    streamSectionData(sectionId: string, data?: string, bypassTimeStream?: boolean, bypassChangeDetection?: boolean): string | undefined;
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
    streamDestroy(clientId?: string): boolean;
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
    _streamData(): string;
    /**
     * Removes all references to any behaviour methods that were added to
     * this object.
     */
    destroyBehaviours(): void;
    /**
     * Destroys the object and all it's child objects, removing them from the
     * scenegraph and from memory.
     */
    destroy(): this;
    /**
     * Calculates the axis-aligned bounding box for this entity, including
     * all child entity bounding boxes and returns the final composite
     * bounds.
     * @example #Get the composite AABB
     *     var entity = new IgeEntity(),
     *         aabb = entity.compositeAabb();
     * @return {IgeRect}
     */
    compositeAabb(inverse?: boolean): IgeRect;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {String}
     */
    stringify(options?: Record<keyof IgeObject | string, boolean>): string;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String}
     */
    _stringify(options?: Record<keyof IgeObject | string, boolean>): string;
    addComponent(id: string, Component: typeof IgeComponent, options?: any): this;
    removeComponent(id: string): this;
}
