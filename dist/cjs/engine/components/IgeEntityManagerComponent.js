"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeEntityManagerComponent = void 0;
const IgeComponent_1 = require("../core/IgeComponent.js");
const IgePoint3d_1 = require("../core/IgePoint3d.js");
const IgeBounds_1 = require("../core/IgeBounds.js");
const instance_1 = require("../instance.js");
const enums_1 = require("../../enums/index.js");
class IgeEntityManagerComponent extends IgeComponent_1.IgeComponent {
    /**
     * @constructor
     * @param {Object} entity The parent object that this component is being added to.
     * @param {Object=} options An optional object that is passed to the component when it is being initialised.
     */
    constructor(entity, options) {
        super(entity, options);
        this.classId = "IgeEntityManagerComponent";
        this.componentId = "entityManager";
        this._lastArea = new IgeBounds_1.IgeBounds();
        this._active = false;
        this._areaRectAutoSize = false;
        /**
         * Adds a map that will be used to read data and convert
         * to entities as the visible map area is moved.
         * @param {IgeTileMap2d=} map
         * @return {*}
         */
        this.addMap = (map) => {
            if (map !== undefined) {
                this._maps.push(map);
            }
            return this._entity;
        };
        /**
         * Gets / sets the boolean flag determining if the entity
         * manager is enabled or not.
         * @param {boolean=} val
         * @return {*}
         */
        this.active = (val) => {
            if (val !== undefined) {
                this._active = val;
                return this._entity;
            }
            return this._active;
        };
        /**
         * Gets / sets the number of entities the entity manager can
         * create per tick. If the number of entities that need to be
         * created is greater than this number they will be queued
         * and processed on the next tick.
         * @param val
         * @return {*}
         */
        this.maxCreatePerTick = (val) => {
            if (val !== undefined) {
                this._maxCreatePerTick = val;
                return this._entity;
            }
            return this._maxCreatePerTick;
        };
        /**
         * Gets / sets the number of entities the entity manager can
         * remove per tick. If the number of entities that need to be
         * removed is greater than this number they will be queued
         * and processed on the next tick.
         * @param val
         * @return {*}
         */
        this.maxRemovePerTick = (val) => {
            if (val !== undefined) {
                this._maxRemovePerTick = val;
                return this._entity;
            }
            return this._maxRemovePerTick;
        };
        /**
         * Gets / sets the overwatch mode for the entity manager. This
         * is the mode that the manager will use when monitoring the
         * entities under its control to determine if any should be
         * removed or not.
         * @param {number=} val Overwatch mode, defaults to 0.
         * @return {*}
         */
        this.overwatchMode = (val) => {
            if (val !== undefined) {
                this._overwatchMode = val;
                return this._entity;
            }
            return this._overwatchMode;
        };
        /**
         * Adds a callback method that is called before an entity is
         * created and asks the callback to return true if the entity
         * should be allowed to be created, or false if not.
         * @param {Function=} val The callback method.
         * @return {*}
         */
        this.createCheck = (val) => {
            if (val !== undefined) {
                this._createCheck = val;
                return this._entity;
            }
            return this._createCheck;
        };
        /**
         * Adds a callback method that is called to allow you to execute
         * the required code to create the desired entity from the map
         * data you are being passed.
         * @param {Function=} val The callback method.
         * @return {*}
         */
        this.createEntityFromMapData = (val) => {
            if (val !== undefined) {
                this._createEntityFromMapData = val;
                return this._entity;
            }
            return this._createEntityFromMapData;
        };
        /**
         * Adds a callback method that is called before an entity is removed
         * and if the callback returns true then the entity will be removed
         * or if false, will not.
         * @param {Function=} val The callback method.
         * @return {*}
         */
        this.removeCheck = (val) => {
            if (val !== undefined) {
                this._removeCheck = val;
                return this._entity;
            }
            return this._removeCheck;
        };
        /**
         * Get / sets the entity that will be used to determine the
         * center point of the area to manage. This allows the
         * area to become dynamic based on this entity's position.
         * @param entity
         * @return {*}
         */
        this.trackTranslate = (entity) => {
            if (entity !== undefined) {
                this._trackTranslateTarget = entity;
                return this;
            }
            return this._trackTranslateTarget;
        };
        /**
         * Stops tracking the current tracking target's translation.
         */
        this.unTrackTranslate = () => {
            delete this._trackTranslateTarget;
        };
        /**
         * Gets / sets the center position of the management area.
         * @param {number=} x
         * @param {number=} y
         * @return {*}
         */
        this.areaCenter = (x, y) => {
            if (x !== undefined && y !== undefined) {
                // Adjust the passed x, y to account for this
                // texture map's translation
                const ent = this._entity;
                let offset;
                if (ent._renderMode === enums_1.IgeEntityRenderMode.flat) {
                    // 2d mode
                    offset = ent._translate;
                }
                if (ent._renderMode === enums_1.IgeEntityRenderMode.iso) {
                    // Iso mode
                    offset = ent._translate.toIso();
                }
                x -= offset.x;
                y -= offset.y;
                this._areaCenter = new IgePoint3d_1.IgePoint3d(x, y, 0);
                return this._entity;
            }
            return this._areaCenter;
        };
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
        this.areaRect = (x, y, width, height) => {
            if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
                this._areaRect = new IgeBounds_1.IgeBounds(x, y, width, height);
                return this._entity;
            }
            return this._areaRect;
        };
        this.areaRectAutoSize = (val, options) => {
            if (val !== undefined) {
                this._areaRectAutoSize = val;
                this._areaRectAutoSizeOptions = options;
                return this._entity;
            }
            return this._areaRectAutoSize;
        };
        /**
         * Returns the current management area.
         * @return {IgeBounds}
         */
        this.currentArea = () => {
            // Check if we are tracking an entity that is used to
            // set the center point of the area
            if (this._trackTranslateTarget) {
                let entTranslate;
                // Calculate which tile our character is currently "over"
                if (this._trackTranslateTarget.isometric() === true) {
                    entTranslate = this._trackTranslateTarget._translate.toIso();
                }
                else {
                    entTranslate = this._trackTranslateTarget._translate;
                }
                this.areaCenter(entTranslate.x, entTranslate.y);
            }
            const areaRect = this._areaRect, areaCenter = this._areaCenter;
            if (areaRect && areaCenter) {
                return new IgeBounds_1.IgeBounds(Math.floor(areaRect.x + areaCenter.x), Math.floor(areaRect.y + areaCenter.y), Math.floor(areaRect.width), Math.floor(areaRect.height));
            }
            else {
                return new IgeBounds_1.IgeBounds(0, 0, 0, 0);
            }
        };
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
        this.removeMode = (val) => {
            if (val !== undefined) {
                this._removeMode = val;
                return this._entity;
            }
            return this._removeMode;
        };
        /**
         * The behaviour method executed each tick.
         * @param entity
         * @param ctx
         * @private
         */
        this._behaviour = (entity, ctx) => {
            const self = this, arr = this._entity._children, maps = self._maps;
            let arrCount = arr.length, currentAreaTiles, item, map, mapIndex, mapData, currentTile, renderX, renderY, renderWidth, renderHeight, x, y, tileData, renderSize, ratio;
            if ((!self._areaRect || instance_1.ige.engine._resized) && self._areaRectAutoSize) {
                self._entity._resizeEvent();
            }
            const currentArea = self.currentArea();
            if (self._areaCenter && self._areaRect && !currentArea.compare(self._lastArea)) {
                ////////////////////////////////////
                // ENTITY REMOVAL CHECKS          //
                ////////////////////////////////////
                /*// Check if the area metrics have changed
                if (this._overwatchMode === 0 && (!currentArea.compare(self._lastArea))) {
                    // Overwatch mode is zero so only scan for entities to remove
                    // if the area metrics have changed.
                }
    
                if (self._overwatchMode === 1) {
                    // Actively scan every tick for entities to remove
                    while (arrCount--) {
                        item = arr[arrCount];
    
                        // Check if the item has an aabb method
                        if (item.aabb) {
                            // Check the entity to see if its bounds are "inside" the
                            // manager's visible area
                            if (!currentArea.intersects(item.aabb())) {
                                // The item is outside the manager's area so
                                // ask the removeCheck callback if we should
                                // remove the entity
                                if (!self._removeCheck || self._removeCheck(item)) {
                                    // Queue the entity for removal
                                    self._removeArr.push(item);
                                }
                            }
                        }
                    }
                }*/
                currentTile = this._entity.pointToTile(self._areaCenter);
                renderX = currentTile.x;
                renderY = currentTile.y;
                renderWidth = Math.ceil(currentArea.width / this._entity._tileWidth);
                renderHeight = Math.ceil(currentArea.height / this._entity._tileHeight);
                currentArea.x -= this._entity._tileWidth;
                currentArea.y -= this._entity._tileHeight / 2;
                currentArea.width += this._entity._tileWidth * 2;
                currentArea.height += this._entity._tileHeight;
                // Check if we are rendering in 2d or isometric mode
                if (this._entity._mountMode === enums_1.IgeMountMode.flat) {
                    // 2d
                    currentAreaTiles = new IgeBounds_1.IgeBounds(renderX - Math.floor(renderWidth / 2) - 1, renderY - Math.floor(renderHeight / 2) - 1, renderX + Math.floor(renderWidth / 2) + 1 - (renderX - Math.floor(renderWidth / 2) - 1), renderY + Math.floor(renderHeight / 2) + 1 - (renderY - Math.floor(renderHeight / 2) - 1));
                }
                if (this._entity._mountMode === enums_1.IgeMountMode.iso) {
                    // Isometric
                    renderSize = Math.abs(renderWidth) > Math.abs(renderHeight) ? renderWidth : renderHeight;
                    ratio = 0.6;
                    currentAreaTiles = new IgeBounds_1.IgeBounds(renderX - Math.floor(renderSize * ratio), renderY - Math.floor(renderSize * ratio), renderX + Math.floor(renderSize * ratio) + 1 - (renderX - Math.floor(renderSize * ratio)), renderY + Math.floor(renderSize * ratio) + 1 - (renderY - Math.floor(renderSize * ratio)));
                }
                // Generate the bounds rectangle
                if (this._entity._drawBounds) {
                    ctx.strokeStyle = "#ff0000";
                    ctx.strokeRect(currentArea.x, currentArea.y, currentArea.width, currentArea.height);
                    this._entity._highlightTileRect = currentAreaTiles;
                }
                ////////////////////////////////////
                // ENTITY REMOVAL CHECKS          //
                ////////////////////////////////////
                //this._highlightTileRect = currentAreaTiles;
                map = this._entity.map;
                while (arrCount--) {
                    item = arr[arrCount];
                    if (!self._removeCheck || self._removeCheck(item)) {
                        if (!currentAreaTiles.intersects(item._occupiedRect)) {
                            // The item is outside the manager's area so
                            // ask the removeCheck callback if we should
                            // remove the entity
                            // Queue the entity for removal
                            self._removeArr.push(item);
                        }
                    }
                }
                ////////////////////////////////////
                // ENTITY CREATION CHECKS         //
                ////////////////////////////////////
                for (mapIndex in maps) {
                    if (maps.hasOwnProperty(mapIndex)) {
                        map = maps[mapIndex];
                        mapData = map.map._mapData;
                        // TODO: This can be optimised further by only checking the area that has changed
                        for (y = currentAreaTiles.y; y < currentAreaTiles.y + currentAreaTiles.height; y++) {
                            if (mapData[y]) {
                                for (x = currentAreaTiles.x; x < currentAreaTiles.x + currentAreaTiles.width; x++) {
                                    // Grab the tile data to paint
                                    tileData = mapData[y][x];
                                    if (tileData) {
                                        if (!self._createCheck || self._createCheck(map, x, y, tileData)) {
                                            // Queue the entity for creation
                                            self._createArr.push([map, x, y, tileData]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                self._lastArea = currentArea;
                // Process the entity queues
                self.processQueues();
            }
        };
        this.processQueues = () => {
            const createArr = this._createArr, createLimit = this._maxCreatePerTick !== undefined ? this._maxCreatePerTick : 0, createEntityFunc = this._createEntityFromMapData, removeArr = this._removeArr, removeLimit = this._maxRemovePerTick !== undefined ? this._maxRemovePerTick : 0;
            let createCount = createArr.length, removeCount = removeArr.length, i;
            if (createLimit && createCount > createLimit) {
                createCount = createLimit;
            }
            if (removeLimit && removeCount > removeLimit) {
                removeCount = removeLimit;
            }
            // Process remove queue
            for (i = 0; i < removeCount; i++) {
                if (this._removeMode === 0) {
                    // Pop the first item off the array and destroy it
                    removeArr.shift().destroy();
                }
            }
            // Process creation
            for (i = 0; i < createCount; i++) {
                // Pop the first item off the array and pass it as arguments
                // to the entity creation method assigned to this manager
                createEntityFunc.apply(this, createArr.shift());
            }
        };
        /**
         * Handles screen resize events.
         * @param event
         * @private
         */
        this._resizeEvent = (event) => {
            // Set width / height of scene to match parent
            if (!this._areaRectAutoSize || !this._entity._parent) {
                return;
            }
            const geom = this._entity._parent._bounds2d;
            let additionX = 0, additionY = 0;
            if (this._areaRectAutoSizeOptions) {
                if (this._areaRectAutoSizeOptions.bufferMultiple) {
                    additionX = geom.x * this._areaRectAutoSizeOptions.bufferMultiple.x - geom.x;
                    additionY = geom.y * this._areaRectAutoSizeOptions.bufferMultiple.y - geom.y;
                }
                if (this._areaRectAutoSizeOptions.bufferPixels) {
                    additionX = this._areaRectAutoSizeOptions.bufferPixels.x;
                    additionY = this._areaRectAutoSizeOptions.bufferPixels.y;
                }
            }
            this.areaRect(-Math.floor((geom.x + additionX) / 2), -Math.floor((geom.y + additionY) / 2), geom.x + additionX, geom.y + additionY);
            // TODO: This should be updated, _caching and _resizeCacheCanvas() don't
            //   exist on an IgeTileMap2d instance, figure out what they were renamed to
            // if (this._entity._caching > 0) {
            // 	this._entity._resizeCacheCanvas();
            // }
        };
        this._createEntityFromMapData = () => undefined;
        // Check we are being added to a tile map
        if (!this._entity.pointToTile) {
            this.log("Warning, IgeEntityManagerComponent is only meant to be added to a tile map!", "warning");
        }
        this._maps = [];
        this._overwatchMode = 0;
        this._removeMode = 0;
        this._createArr = [];
        this._removeArr = [];
        entity.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "entityManager", this._behaviour);
    }
}
exports.IgeEntityManagerComponent = IgeEntityManagerComponent;
