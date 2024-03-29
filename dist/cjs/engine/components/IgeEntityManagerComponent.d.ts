import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEntity } from "../core/IgeEntity.js";
import { IgePoint3d } from "../core/IgePoint3d.js"
import { IgeBounds } from "../core/IgeBounds.js";
import type { IgeTileMap2d } from "../core/IgeTileMap2d.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js";
export declare class IgeEntityManagerComponent extends IgeComponent<IgeTileMap2d> {
    classId: string;
    componentId: string;
    _lastArea: IgeBounds;
    private _maps;
    private _overwatchMode;
    private _removeMode;
    private _createArr;
    private _removeArr;
    private _active;
    private _maxCreatePerTick?;
    private _maxRemovePerTick?;
    private _createCheck?;
    private _removeCheck?;
    private _trackTranslateTarget?;
    private _areaCenter?;
    private _areaRect?;
    private _areaRectAutoSize;
    private _areaRectAutoSizeOptions;
    /**
     * @constructor
     * @param {Object} entity The parent object that this component is being added to.
     * @param {Object=} options An optional object that is passed to the component when it is being initialised.
     */
    constructor(entity: IgeTileMap2d, options?: any);
    /**
     * Adds a map that will be used to read data and convert
     * to entities as the visible map area is moved.
     * @param {IgeTileMap2d=} map
     * @return {*}
     */
    addMap: (map: any) => IgeTileMap2d<any>;
    /**
     * Gets / sets the boolean flag determining if the entity
     * manager is enabled or not.
     * @param {boolean=} val
     * @return {*}
     */
    active: (val: any) => boolean | IgeTileMap2d<any>;
    /**
     * Gets / sets the number of entities the entity manager can
     * create per tick. If the number of entities that need to be
     * created is greater than this number they will be queued
     * and processed on the next tick.
     * @param val
     * @return {*}
     */
    maxCreatePerTick: (val: any) => number | IgeTileMap2d<any> | undefined;
    /**
     * Gets / sets the number of entities the entity manager can
     * remove per tick. If the number of entities that need to be
     * removed is greater than this number they will be queued
     * and processed on the next tick.
     * @param val
     * @return {*}
     */
    maxRemovePerTick: (val: any) => number | IgeTileMap2d<any> | undefined;
    /**
     * Gets / sets the overwatch mode for the entity manager. This
     * is the mode that the manager will use when monitoring the
     * entities under its control to determine if any should be
     * removed or not.
     * @param {number=} val Overwatch mode, defaults to 0.
     * @return {*}
     */
    overwatchMode: (val: any) => number | IgeTileMap2d<any>;
    /**
     * Adds a callback method that is called before an entity is
     * created and asks the callback to return true if the entity
     * should be allowed to be created, or false if not.
     * @param {Function=} val The callback method.
     * @return {*}
     */
    createCheck: (val: any) => IgeTileMap2d<any> | ((item: any, x: any, y: any, tileData: any) => boolean) | undefined;
    /**
     * Adds a callback method that is called to allow you to execute
     * the required code to create the desired entity from the map
     * data you are being passed.
     * @param {Function=} val The callback method.
     * @return {*}
     */
    createEntityFromMapData: (val: any) => IgeTileMap2d<any> | (() => any);
    /**
     * Adds a callback method that is called before an entity is removed
     * and if the callback returns true then the entity will be removed
     * or if false, will not.
     * @param {Function=} val The callback method.
     * @return {*}
     */
    removeCheck: (val: any) => IgeTileMap2d<any> | ((item: any) => boolean) | undefined;
    /**
     * Get / sets the entity that will be used to determine the
     * center point of the area to manage. This allows the
     * area to become dynamic based on this entity's position.
     * @param entity
     * @return {*}
     */
    trackTranslate: (entity: any) => IgeEntity | this | undefined;
    /**
     * Stops tracking the current tracking target's translation.
     */
    unTrackTranslate: () => void;
    /**
     * Gets / sets the center position of the management area.
     * @param {number=} x
     * @param {number=} y
     * @return {*}
     */
    areaCenter: (x: any, y: any) => IgePoint3d | IgeTileMap2d<any> | undefined;
    /**
     * Gets / sets the area rectangle of the management area where
     * entities outside this area are considered for removal and map
     * data that falls inside this area is considered for entity
     * creation.
     * @param {number=} x
     * @param {number=} y
     * @param {number=} width
     * @param {number=} height
     * @return {*}
     */
    areaRect: (x: any, y: any, width: any, height: any) => IgeBounds | IgeTileMap2d<any> | undefined;
    areaRectAutoSize: (val: any, options: any) => boolean | IgeTileMap2d<any>;
    /**
     * Returns the current management area.
     * @return {IgeBounds}
     */
    currentArea: () => IgeBounds;
    /**
     * Gets / sets the mode that entities will be removed with.
     * If set to 0 (default) the entities will be removed via a
     * call to their destroy() method. If set to 1, entities will
     * be unmounted via a call to unMount(). This means that their
     * associated box2d bodies will not be removed from the
     * simulation if in mode 1.
     * @param val
     * @return {*}
     */
    removeMode: (val: any) => number | IgeTileMap2d<any>;
    /**
     * The behaviour method executed each tick.
     * @param entity
     * @param ctx
     * @private
     */
    _behaviour: (entity: IgeEntity, ctx: IgeCanvasRenderingContext2d) => void;
    processQueues: () => void;
    /**
     * Handles screen resize events.
     * @param event
     * @private
     */
    _resizeEvent: (event: any) => void;
    private _createEntityFromMapData;
}
