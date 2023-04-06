import { ige } from "../instance.js";
import { isClient, isServer } from "../clientServer.js";
import { degreesToRadians, traceSet } from "../utils.js";
import { IgePoint2d } from "./IgePoint2d.js";
import { IgePoint3d } from "./IgePoint3d.js";
import { IgeMatrix2d } from "./IgeMatrix2d.js";
import { IgePoly2d } from "./IgePoly2d.js";
import { IgeDummyCanvas } from "./IgeDummyCanvas.js";
import { IgeRect } from "./IgeRect.js";
import { IgeObject } from "./IgeObject.js";
import { IgeMountMode } from "../../enums/IgeMountMode.js";
import { IgeStreamMode } from "../../enums/IgeStreamMode.js";
import { IgeIsometricDepthSortMode } from "../../enums/IgeIsometricDepthSortMode.js";
import { IgeEntityRenderMode } from "../../enums/IgeEntityRenderMode.js";
import { IgeBehaviourType } from "../../enums/IgeBehaviourType.js";
import { registerClass } from "../../engine/igeClassStore.js";
/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
 */
export class IgeEntity extends IgeObject {
    constructor() {
        super();
        this.classId = "IgeEntity";
        this._renderMode = IgeEntityRenderMode.flat;
        //_entity?: IgeEntity; // We comment this because any class wanting to override return values of methods can do so individually e.g. viewport.camera.width().height()
        this._parent = null;
        this._children = [];
        this._sortChildren = (compareFn) => {
            return this._children.sort(compareFn);
        };
        /**
         * Gets / sets the shape / polygon that the mouse events
         * are triggered against. There are two options, 'aabb' and
         * 'isoBounds'. The default is 'aabb'.
         * @param val
         * @returns {*}
         * @deprecated Please use triggerPolygonFunctionName() instead
         */
        this.mouseEventTrigger = (val) => {
            this.log("mouseEventTrigger is no longer in use. Please see triggerPolygonFunctionName() instead.", "warning");
        };
        /**
         * Handler method that determines which mouse-move event
         * to fire, a mouse-over or a mouse-move.
         * @private
         */
        this._handleMouseIn = (event, evc, data) => {
            // Check if the mouse move is a mouse over
            if (!this._pointerStateOver) {
                this._pointerStateOver = true;
                if (this._pointerOver) {
                    this._pointerOver(event, evc, data);
                }
                /**
                 * Fires when the mouse moves over the entity.
                 * @event IgeEntity#pointerOver
                 * @param {Object} The DOM event object.
                 * @param {Object} The IGE event control object.
                 * @param {*} Any further event data.
                 */
                this.emit("pointerOver", event, evc, data);
            }
            if (this._pointerMove) {
                this._pointerMove(event, evc, data);
            }
            this.emit("pointerMove", event, evc, data);
        };
        /**
         * Handler method that determines if a mouse-out event
         * should be fired.
         * @private
         */
        this._handleMouseOut = (event, evc, data) => {
            // The mouse went away from this entity so
            // set mouse-down to false, regardless of the situation
            this._pointerStateDown = false;
            // Check if the mouse move is a mouse out
            if (!this._pointerStateOver) {
                return;
            }
            this._pointerStateOver = false;
            if (this._pointerOut) {
                this._pointerOut(event, evc, data);
            }
            /**
             * Fires when the mouse moves away from the entity.
             * @event IgeEntity#pointerOut
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
            this.emit("pointerOut", event, evc, data);
        };
        /**
         * Handler method that determines if a mouse-wheel event
         * should be fired.
         * @private
         */
        this._handleMouseWheel = (event, evc, data) => {
            if (this._pointerWheel) {
                this._pointerWheel(event, evc, data);
            }
            /**
             * Fires when the mouse wheel is moved over the entity.
             * @event IgeEntity#pointerWheel
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
            this.emit("pointerWheel", event, evc, data);
        };
        /**
         * Handler method that determines if a mouse-up event
         * should be fired.
         * @private
         */
        this._handleMouseUp = (event, evc, data) => {
            // Reset the mouse-down flag
            this._pointerStateDown = false;
            if (this._pointerUp) {
                this._pointerUp(event, evc, data);
            }
            /**
             * Fires when a mouse up occurs on the entity.
             * @event IgeEntity#pointerUp
             * @param {Object} The DOM event object.
             * @param {Object} The IGE event control object.
             * @param {*} Any further event data.
             */
            this.emit("pointerUp", event, evc, data);
        };
        /**
         * Handler method that determines if a mouse-down event
         * should be fired.
         * @private
         */
        this._handleMouseDown = (event, evc, data) => {
            if (!this._pointerStateDown) {
                this._pointerStateDown = true;
                if (this._pointerDown) {
                    this._pointerDown(event, evc, data);
                }
                /**
                 * Fires when a mouse down occurs on the entity.
                 * @event IgeEntity#pointerDown
                 * @param {Object} The DOM event object.
                 * @param {Object} The IGE event control object.
                 * @param {*} Any further event data.
                 */
                this.emit("pointerDown", event, evc, data);
            }
        };
        /**
         * Checks mouse input types and fires the correct mouse event
         * handler. This is an internal method that should never be
         * called externally.
         * @param {Object} evc The input component event control object.
         * @param {Object} eventData Data passed by the input component into
         * the new event.
         * @private
         */
        this._mouseInTrigger = (evc, eventData) => {
            const input = ige.input;
            if (input.pointerMove) {
                // There is a mouse move event
                this._handleMouseIn(input.pointerMove, evc, eventData);
            }
            if (input.pointerDown) {
                // There is a mouse down event
                this._handleMouseDown(input.pointerDown, evc, eventData);
            }
            if (input.pointerUp) {
                // There is a mouse up event
                this._handleMouseUp(input.pointerUp, evc, eventData);
            }
            if (input.pointerWheel) {
                // There is a mouse wheel event
                this._handleMouseWheel(input.pointerWheel, evc, eventData);
            }
        };
        // Register the IgeEntity special properties handler for
        // serialise and de-serialise support
        this._specialProp.push("_texture");
        this._specialProp.push("_eventListeners");
        this._specialProp.push("_aabb");
        //this._mouseEventTrigger = 0;
        if (isServer) {
            // Set the stream floating point precision to 2 as default
            this.streamFloatPrecision(2);
        }
        // Set the default stream sections as just the transform data
        this.streamSections(["transform"]);
    }
    /**
     * Calculates the distance to the passed entity from this one.
     * @param {IgeEntity} entity The entity to calculate distance
     * to.
     * @returns {number} Distance.
     */
    distanceTo(entity) {
        const a = this._translate.x - entity._translate.x, b = this._translate.y - entity._translate.y;
        return Math.sqrt(a * a + b * b);
    }
    /**
     * Clones the object and all its children and returns a new object.
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
     * Checks the current transform values against the previous ones. If
     * any value is different, the appropriate method is called which will
     * update the transformation matrix accordingly.
     */
    updateTransform() {
        this._localMatrix.identity();
        if (this._renderMode === 0) {
            // 2d translation
            this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
        }
        if (this._renderMode === 1) {
            // iso translation
            const isoPoint = this._translateIso = (new IgePoint3d(this._translate.x, this._translate.y, this._translate.z + this._bounds3d.z / 2).toIso());
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
        }
        else {
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
        }
        else {
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
     * Sets the entity as visible and able to be interacted with.
     * @example #Show a hidden entity
     *     entity.show();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
    show() {
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
    hide() {
        this._hidden = true;
        return this;
    }
    /**
     * Checks if the entity is visible.
     * @returns {boolean} True if the entity is visible.
     */
    isVisible() {
        return !this._hidden;
    }
    /**
     * Checks if the entity is hidden.
     * @returns {boolean} True if the entity is hidden.
     */
    isHidden() {
        return this._hidden;
    }
    cacheSmoothing(val) {
        if (val !== undefined) {
            this._cacheSmoothing = val;
            return this;
        }
        return this._cacheSmoothing;
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
    mousePos(viewport) {
        viewport = viewport || ige.engine._currentViewport;
        if (!viewport) {
            return new IgePoint3d(0, 0, 0);
        }
        const mp = viewport._pointerPos.clone();
        // if (this._ignoreCamera) {
        //      const cam = ige.engine._currentCamera;
        // 	    mp.thisMultiply(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
        // 	    //mp.thisRotate(-cam._rotate.z);
        // 	    mp.thisAddPoint(cam._translate);
        // }
        // TODO: No idea why viewport doesn't have _translate, it's extended from IgeEntity!
        // @ts-ignore
        mp.x += viewport._translate.x;
        // @ts-ignore
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
    mousePosAbsolute(viewport) {
        viewport = viewport || ige.engine._currentViewport;
        if (viewport) {
            const mp = viewport._pointerPos.clone();
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
    mousePosWorld(viewport) {
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
     * @example #Point the entity at another one
     *     entity.rotateToPoint(otherEntity.worldPosition());
     * @example #Point the entity at mouse
     *     entity.rotateToPoint(ige.engine._currentViewport.mousePos());
     * @example #Point the entity at an arbitrary point x, y
     *     entity.rotateToPoint(new IgePoint3d(x, y, 0));
     * @return {*}
     */
    rotateToPoint(point) {
        var _a, _b, _c;
        const worldPos = this.worldPosition();
        this.rotateTo(this._rotate.x, this._rotate.y, Math.atan2(worldPos.y - point.y, worldPos.x - point.x) - ((_c = (_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._rotate) === null || _b === void 0 ? void 0 : _b.z) !== null && _c !== void 0 ? _c : 0) + degreesToRadians(270));
        return this;
    }
    backgroundPattern(texture, repeat = "repeat", trackCamera = false, isoTile = false) {
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
    smartBackground(renderMethod) {
        if (renderMethod !== undefined) {
            this._smartBackground = renderMethod;
            return this;
        }
        return this._smartBackground;
    }
    /**
     * Set the object's width to the number of tile width's specified.
     * @param {number} val Number of tiles.
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
    widthByTile(val, lockAspect = false) {
        if (!(this._parent && this._parent.IgeTileMap2d && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined)) {
            throw new Error("Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.");
        }
        const tileSize = this._renderMode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2;
        this.width(val * tileSize);
        if (lockAspect) {
            if (this._texture) {
                // Calculate the height based on the new width
                const ratio = this._texture._sizeX / this._bounds2d.x;
                this.height(this._texture._sizeY / ratio);
            }
            else {
                this.log("Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!", "error");
            }
        }
        return this;
    }
    /**
     * Set the object's height to the number of tile height's specified.
     * @param {number} val Number of tiles.
     * @param {Boolean=} lockAspect If true, sets the width according
     * to the texture aspect ratio and the new height.
     * @example #Set the height of the entity based on the tile height of the map the entity is mounted to
     *     // Set the entity height to the size of 1 tile with
     *     // lock aspect enabled which will automatically size
     *     // the width as well to maintain the aspect ratio
     *     entity.heightByTile(1, true);
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
    heightByTile(val, lockAspect = false) {
        if (!(this._parent && this._parent.IgeTileMap2d && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined)) {
            throw new Error("Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.");
        }
        const tileSize = this._renderMode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2;
        this.height(val * tileSize);
        if (lockAspect) {
            if (this._texture) {
                // Calculate the width based on the new height
                const ratio = this._texture._sizeY / this._bounds2d.y;
                this.width(this._texture._sizeX / ratio);
            }
            else {
                this.log("Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!", "error");
            }
        }
        return this;
    }
    /**
     * Adds the object to the tile map at the passed tile co-ordinates. If
     * no tile co-ordinates are passed, will use the current tile position
     * and the tileWidth() and tileHeight() values.
     * @param {number=} x X co-ordinate of the tile to occupy.
     * @param {number=} y Y co-ordinate of the tile to occupy.
     * @param {number=} width Number of tiles along the x-axis to occupy.
     * @param {number=} height Number of tiles along the y-axis to occupy.
     */
    occupyTile(x, y, width, height) {
        // Check that the entity is mounted to a tile map
        if (!(this._parent && this._parent.IgeTileMap2d)) {
            return this;
        }
        if (this._tileWidth === undefined || this._tileHeight === undefined) {
            return this;
        }
        if (x !== undefined && y !== undefined) {
            this._parent.occupyTile(x, y, width, height, this);
            return this;
        }
        // Occupy tiles based upon tile point and tile width/height
        const trPoint = new IgePoint3d(this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth, this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight, 0);
        const tilePoint = this._parent.pointToTile(trPoint);
        if (this._parent._mountMode === IgeMountMode.iso) {
            tilePoint.thisToIso();
        }
        this._parent.occupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight, this);
        return this;
    }
    /**
     * Removes the object from the tile map at the passed tile co-ordinates.
     * If no tile co-ordinates are passed, will use the current tile position
     * and the tileWidth() and tileHeight() values.
     * @param {number=} x X co-ordinate of the tile to un-occupy.
     * @param {number=} y Y co-ordinate of the tile to un-occupy.
     * @param {number=} width Number of tiles along the x-axis to un-occupy.
     * @param {number=} height Number of tiles along the y-axis to un-occupy.
     * @private
     */
    unOccupyTile(x, y, width, height) {
        // Check that the entity is mounted to a tile map
        if (!(this._parent && this._parent.IgeTileMap2d)) {
            return this;
        }
        if (this._tileWidth === undefined || this._tileHeight === undefined) {
            return this;
        }
        if (x !== undefined && y !== undefined) {
            this._parent.unOccupyTile(x, y, width, height);
            return this;
        }
        // Un-occupy tiles based upon tile point and tile width/height
        const trPoint = new IgePoint3d(this._translate.x - (this._tileWidth / 2 - 0.5) * this._parent._tileWidth, this._translate.y - (this._tileHeight / 2 - 0.5) * this._parent._tileHeight, 0), tilePoint = this._parent.pointToTile(trPoint);
        if (this._parent._mountMode === IgeMountMode.iso) {
            tilePoint.thisToIso();
        }
        this._parent.unOccupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight);
        return this;
    }
    /**
     * Returns an array of tile co-ordinates that the object is currently
     * over, calculated using the current world co-ordinates of the object
     * as well as its 3d geometry.
     * @private
     * @return {Array} The array of tile co-ordinates as IgePoint3d instances.
     */
    overTiles() {
        // Check that the entity is mounted to a tile map
        if (!(this._parent && this._parent.IgeTileMap2d)) {
            return;
        }
        const tileWidth = this._tileWidth || 1;
        const tileHeight = this._tileHeight || 1;
        const tile = this._parent.pointToTile(this._translate);
        const tileArr = [];
        for (let x = 0; x < tileWidth; x++) {
            for (let y = 0; y < tileHeight; y++) {
                tileArr.push(new IgePoint3d(tile.x + x, tile.y + y, 0));
            }
        }
        return tileArr;
    }
    anchor(x, y) {
        if (x !== undefined && y !== undefined) {
            this._anchor = new IgePoint2d(x, y);
            return this;
        }
        return this._anchor;
    }
    width(px, lockAspect = false) {
        if (px === undefined) {
            return this._bounds2d.x;
        }
        if (typeof px === "string") {
            px = parseFloat(px);
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
    height(px, lockAspect = false) {
        if (px === undefined) {
            return this._bounds2d.y;
        }
        if (typeof px === "string") {
            px = parseFloat(px);
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
    bounds2d(x, y) {
        if (x !== undefined && y !== undefined && typeof x === "number") {
            this._bounds2d = new IgePoint2d(x, y);
            return this;
        }
        // TODO: Is this exception still something we use?
        if (typeof x === "object" && y === undefined) {
            const bounds = x;
            // x is considered an IgePoint2d instance
            this._bounds2d = new IgePoint2d(bounds.x, bounds.y);
        }
        return this._bounds2d;
    }
    bounds3d(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._bounds3d = new IgePoint3d(x, y, z);
            return this;
        }
        return this._bounds3d;
    }
    lifeSpan(milliseconds, deathCallback) {
        if (milliseconds !== undefined) {
            this.deathTime(ige.engine._currentTime + milliseconds, deathCallback);
            return this;
        }
        return (this.deathTime() || 0) - ige.engine._currentTime;
    }
    deathTime(val, deathCallback) {
        if (val !== undefined) {
            this._deathTime = val;
            if (deathCallback !== undefined) {
                this._deathCallBack = deathCallback;
            }
            return this;
        }
        return this._deathTime;
    }
    opacity(val) {
        if (val !== undefined) {
            this._opacity = val;
            return this;
        }
        return this._opacity;
    }
    noAabb(val) {
        if (val !== undefined) {
            this._noAabb = val;
            return this;
        }
        return this._noAabb;
    }
    texture(texture) {
        if (texture !== undefined) {
            this._texture = texture;
            return this;
        }
        return this._texture;
    }
    cell(val) {
        if (val !== undefined && (val === null || val > 0)) {
            this._cell = val;
            return this;
        }
        return this._cell;
    }
    cellById(val) {
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
                this.log(`Could not find the cell id "${val}" in the assigned entity texture ${tex.id()}, please check your sprite sheet (texture) cell definition to ensure the cell id "${val}" has been assigned to a cell!`, "error");
            }
            else {
                this.log("Cannot assign cell index from cell ID until an IgeSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().", "error");
            }
        }
        return this._cell;
    }
    /**
     * Sets the geometry of the entity to match the width and height
     * of the assigned texture.
     * @param {number=} percent The percentage size to resize to.
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
    dimensionsFromTexture(percent) {
        if (this._texture) {
            if (percent === undefined) {
                this.width(this._texture._sizeX);
                this.height(this._texture._sizeY);
            }
            else {
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
     * @param {number=} percent The percentage size to resize to.
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
    dimensionsFromCell(percent) {
        if (typeof this._cell !== "number") {
            throw new Error("Cell of type string cannot access dimensions");
        }
        if (this._texture) {
            if (this._texture._cells && this._texture._cells.length && this._cell) {
                if (percent === undefined) {
                    this.width(this._texture._cells[this._cell][2]);
                    this.height(this._texture._cells[this._cell][3]);
                }
                else {
                    this.width(Math.floor((this._texture._cells[this._cell][2] / 100) * percent));
                    this.height(Math.floor((this._texture._cells[this._cell][3] / 100) * percent));
                }
                // Recalculate localAabb
                this.localAabb(true);
            }
        }
        return this;
    }
    highlight(val, highlightChildEntities = true) {
        if (val !== undefined) {
            this._highlight = val;
            if (highlightChildEntities) {
                this._children.forEach((child) => {
                    if (!("highlight" in child))
                        return;
                    child.highlight(val);
                });
            }
            this.cacheDirty(true);
            return this;
        }
        return this._highlight;
    }
    // Commented as this can't have ever worked
    // mouseInBounds3d (recalculate = false): boolean {
    // 	const poly = this.localBounds3dPolygon(recalculate),
    // 		mp = this.mousePos();
    //
    // 	// TODO this won't work because pointInside doesn't exist on IgePoly2d
    // 	return poly.pointInside(mp);
    // }
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
    aabb(recalculate = true, inverse = false) {
        if (!(this._aabbDirty || !this._aabb || recalculate)) {
            return this._aabb;
        }
        //  && this.newFrame()
        const poly = new IgePoly2d();
        const anc = this._anchor;
        const ancX = anc.x;
        const ancY = anc.y;
        const geom = this._bounds2d;
        const geomX2 = geom.x2;
        const geomY2 = geom.y2;
        const x = geomX2;
        const y = geomY2;
        poly.addPoint(-x + ancX, -y + ancY);
        poly.addPoint(x + ancX, -y + ancY);
        poly.addPoint(x + ancX, y + ancY);
        poly.addPoint(-x + ancX, y + ancY);
        this._renderPos = { x: -x + ancX, y: -y + ancY };
        // Convert the poly's points from local space to world space
        this.localToWorld(poly._poly, null, inverse);
        // Get the extents of the newly transformed poly
        const minX = Math.min(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);
        const minY = Math.min(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);
        const maxX = Math.max(poly._poly[0].x, poly._poly[1].x, poly._poly[2].x, poly._poly[3].x);
        const maxY = Math.max(poly._poly[0].y, poly._poly[1].y, poly._poly[2].y, poly._poly[3].y);
        if (isNaN(minX) || isNaN(minY) || isNaN(maxX) || isNaN(maxY)) {
            debugger;
        }
        this._aabb = new IgeRect(minX, minY, maxX - minX, maxY - minY);
        this._aabbDirty = false;
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
    localAabb(recalculate = false) {
        if (this._localAabb && !recalculate) {
            return this._localAabb;
        }
        const aabb = this.aabb();
        this._localAabb = new IgeRect(-Math.floor(aabb.width / 2), -Math.floor(aabb.height / 2), Math.floor(aabb.width), Math.floor(aabb.height));
    }
    /**
     * Takes two values and returns them as an array where argument[0]
     * is the y argument and argument[1] is the x argument. This method
     * is used specifically in the 3d bounds intersection process to
     * determine entity depth sorting.
     * @private
     * @param num1
     * @param num2
     * @return {Array} The swapped arguments.
     */
    _swapVars(num1, num2) {
        return [num1, num2];
    }
    _internalsOverlap(x0, x1, y0, y1) {
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
            y0 = tempSwap[1];
            tempSwap = this._swapVars(x1, y1);
            x1 = tempSwap[0];
        }
        return y0 < x1;
    }
    _projectionOverlap(otherObject) {
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
        return (this._internalsOverlap(thisMin.x - thisMax.y, thisMax.x - thisMin.y, otherMin.x - otherMax.y, otherMax.x - otherMin.y) &&
            this._internalsOverlap(thisMin.x - thisMax.z, thisMax.x - thisMin.z, otherMin.x - otherMax.z, otherMax.x - otherMin.z) &&
            this._internalsOverlap(thisMin.z - thisMax.y, thisMax.z - thisMin.y, otherMin.z - otherMax.y, otherMax.z - otherMin.y));
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
    isBehind(otherObject) {
        const thisG3d = this._bounds3d, otherG3d = otherObject._bounds3d, thisTranslate = this._translate.clone(), otherTranslate = otherObject._translate.clone();
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
        const thisX = thisTranslate.x, thisY = thisTranslate.y, otherX = otherTranslate.x, otherY = otherTranslate.y, thisMin = new IgePoint3d(thisX - thisG3d.x / 2, thisY - thisG3d.y / 2, this._translate.z), thisMax = new IgePoint3d(thisX + thisG3d.x / 2, thisY + thisG3d.y / 2, this._translate.z + thisG3d.z), otherMin = new IgePoint3d(otherX - otherG3d.x / 2, otherY - otherG3d.y / 2, otherObject._translate.z), otherMax = new IgePoint3d(otherX + otherG3d.x / 2, otherY + otherG3d.y / 2, otherObject._translate.z + otherG3d.z);
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
    pointerEventsActive(val) {
        if (val !== undefined) {
            this._pointerEventsActive = val;
            return this;
        }
        return this._pointerEventsActive;
    }
    /**
     * Sets the _ignoreCamera internal flag to the value passed for this
     * and all child entities down the scenegraph.
     * @param val
     */
    ignoreCameraComposite(val) {
        const arr = this._children;
        const arrCount = arr.length;
        this._ignoreCamera = val;
        for (let i = 0; i < arrCount; i++) {
            const arrItem = arr[i];
            if ("ignoreCameraComposite" in arrItem) {
                arrItem.ignoreCameraComposite(val);
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
     * cause the entity tick() method to fire once for each viewport,
     * but you only want to execute update code such as movement,
     * on the first time the tick() method is called.
     *
     * @example #Determine if the entity has already had its tick method called
     *     var tickAlreadyCalled = entity.newFrame();
     * @return {Boolean} If false, the entity's tick method has
     * not yet been processed for this tick.
     */
    newFrame() {
        return ige.engine._frameAlternator !== this._frameAlternatorCurrent;
    }
    /**
     * Sets the canvas context transform properties to match the game
     * object's current transform values.
     * @param {CanvasRenderingContext2D} ctx The canvas context to apply
     * the transformation matrix to.
     * @param inverse
     * @example #Transform a canvas context to the entity's local matrix values
     *     var canvas = document.createElement('canvas');
     *     canvas.width = 800;
     *     canvas.height = 600;
     *
     *     var ctx = canvas.getContext('2d');
     *     entity._transformContext(ctx);
     * @private
     */
    _transformContext(ctx, inverse = false) {
        var _a;
        if (this._parent) {
            ctx.globalAlpha = this._computedOpacity = this._parent._computedOpacity * this._opacity;
        }
        else {
            ctx.globalAlpha = this._computedOpacity = this._opacity;
        }
        if (!inverse) {
            this._localMatrix.transformRenderingContext(ctx);
        }
        else {
            (_a = this._localMatrix.getInverse()) === null || _a === void 0 ? void 0 : _a.transformRenderingContext(ctx);
        }
    }
    pointerAlwaysInside(val) {
        if (val !== undefined) {
            this._pointerAlwaysInside = val;
            return this;
        }
        return this._pointerAlwaysInside;
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
    tick(ctx, dontTransform = false) {
        if (!(!this._hidden && this._inView && (!this._parent || this._parent._inView) && !this._streamJustCreated)) {
            return;
        }
        this._processBehaviours(IgeBehaviourType.preTick, ctx);
        if (this._pointerEventsActive) {
            const input = ige.input;
            if (this._processTriggerHitTests()) {
                // Point is inside the trigger bounds
                input.queueEvent(this._mouseInTrigger, null);
            }
            else {
                if (input.pointerMove) {
                    // There is a mouse move event, but we are not inside the entity
                    // so fire a mouse out event (_handleMouseOut will check if the
                    // mouse WAS inside before firing an out event).
                    this._handleMouseOut(input.pointerMove);
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
        }
        else {
            // Non-cached output
            // Transform the context by the current transform settings
            if (!dontTransform) {
                this._transformContext(ctx);
            }
            // Render the entity
            this._renderEntity(ctx);
        }
        if (this._streamMode === IgeStreamMode.simple) {
            this.streamSync();
        }
        if (this._compositeCache) {
            if (this._cacheDirty && this._cacheCtx) {
                // Process children
                super.tick(this._cacheCtx);
                this._renderCache(ctx);
                this._cacheDirty = false;
            }
        }
        else {
            // Process children
            super.tick(ctx);
        }
    }
    _processTriggerHitTests() {
        if (!ige.engine._currentViewport) {
            return false;
        }
        if (this._pointerAlwaysInside) {
            return true;
        }
        const mp = this.mousePosWorld();
        if (!mp) {
            return false;
        }
        let mouseTriggerPoly;
        // Use the trigger polygon function if defined
        if (this._triggerPolygonFunctionName && this[this._triggerPolygonFunctionName]) {
            mouseTriggerPoly = this[this._triggerPolygonFunctionName]();
        }
        else {
            // Default to either aabb or bounds3dPolygon depending on entity parent mounting mode
            if (this._parent && this._parent._mountMode === IgeMountMode.iso) {
                // Use bounds3dPolygon
                mouseTriggerPoly = this.bounds3dPolygon();
            }
            else {
                // Use aabb
                mouseTriggerPoly = this.aabb();
            }
        }
        // Check if the current mouse position is inside this aabb
        return mouseTriggerPoly.xyInside(mp.x, mp.y);
    }
    _refreshCache(dontTransform = false) {
        // The cache is not clean so re-draw it
        // Render the entity to the cache
        const _canvas = this._cacheCanvas;
        const _ctx = this._cacheCtx;
        if (!_canvas || !_ctx) {
            return;
        }
        if (this._compositeCache) {
            // Get the composite entity AABB and alter the internal canvas
            // to the composite size, so we can render the entire entity
            const aabbC = this.compositeAabb();
            this._compositeAabbCache = aabbC;
            if (aabbC.width > 0 && aabbC.height > 0) {
                ige.engine._setInternalCanvasSize(_canvas, _ctx, aabbC.width, aabbC.height);
                /*_canvas.width = Math.ceil(aabbC.width);
                _canvas.height = Math.ceil(aabbC.height);*/
            }
            else {
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
        }
        else {
            if (this._bounds2d.x > 0 && this._bounds2d.y > 0) {
                ige.engine._setInternalCanvasSize(_canvas, _ctx, this._bounds2d.x, this._bounds2d.y);
                /*_canvas.width = this._bounds2d.x;
                _canvas.height = this._bounds2d.y;*/
            }
            else {
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
        this._renderEntity(_ctx);
    }
    /**
     * Handles calling the texture.render() method if a texture
     * is applied to the entity. This part of the tick process has
     * been abstracted to allow it to be overridden by an extending
     * class.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render
     * the entity to.
     * @private
     */
    _renderEntity(ctx) {
        if (this._opacity <= 0 || !ige.engine._currentCamera || !ige.engine._currentViewport) {
            return;
        }
        if (this._backgroundPattern && this._backgroundPattern.image) {
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
                    this._smartBackground.render(ctx, this);
                }
                else {
                    // TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change
                    // This is the proper way to do this but firefox has a bug which I'm going to report,
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
                        ctx.translate(-Math.floor(this._backgroundPattern.image.width) / 2, -Math.floor(this._backgroundPattern.image.height / 2));
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
            texture.render(ctx, this);
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
    _renderCache(ctx) {
        if (!ige.engine._currentViewport)
            return;
        if (!this._cacheCanvas || this._cacheCanvas instanceof IgeDummyCanvas)
            return;
        ctx.save();
        if (this._compositeCache && this._compositeAabbCache) {
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
     * Helper method to transform an array of points using _transformPoint.
     * @param {Array} points The points array to transform.
     * @private
     */
    _transformPoints(points) {
        let point, pointCount = points.length;
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
            }
            else {
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
    stringify(options) {
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
                        str += `.opacity(${this.opacity()})`;
                        break;
                    case "_texture":
                        const tmpTexture = this.texture();
                        if (tmpTexture) {
                            str += `.texture(ige.$('${tmpTexture.id()}'))`;
                        }
                        break;
                    case "_cell":
                        str += ".cell(" + this.cell() + ")";
                        break;
                    case "_translate":
                        if (options.transform && options.translate) {
                            str += `.translateTo(${this._translate.x}, ${this._translate.y}, ${this._translate.z})`;
                        }
                        break;
                    case "_rotate":
                        if (options.transform && options.rotate) {
                            str += `.rotateTo(${this._rotate.x}, ${this._rotate.y}, ${this._rotate.z})`;
                        }
                        break;
                    case "_scale":
                        if (options.transform && options.scale) {
                            str += `.scaleTo(${this._scale.x}, ${this._scale.y}, ${this._scale.z})`;
                        }
                        break;
                    case "_origin":
                        if (options.origin) {
                            str += `.originTo(${this._origin.x}, ${this._origin.y}, ${this._origin.z})`;
                        }
                        break;
                    case "_anchor":
                        if (options.anchor) {
                            str += `.anchor(${this._anchor.x}, ${this._anchor.y})`;
                        }
                        break;
                    case "_width":
                        if (typeof this.width() === "string") {
                            str += `.width('${this.width()}')`;
                        }
                        else {
                            str += `.width(${this.width()})`;
                        }
                        break;
                    case "_height":
                        if (typeof this.height() === "string") {
                            str += `.height('${this.height()}')`;
                        }
                        else {
                            str += `.height(${this.height()})`;
                        }
                        break;
                    case "_bounds3d":
                        str += `.bounds3d(${this._bounds3d.x}, ${this._bounds3d.y}, ${this._bounds3d.z})`;
                        break;
                    case "_deathTime":
                        if (options.deathTime && options.lifeSpan) {
                            str += `.deathTime(${this.deathTime()})`;
                        }
                        break;
                    case "_highlight":
                        str += `.highlight(${this.highlight()})`;
                        break;
                    case "_renderMode":
                        str += ".mode(" + this._renderMode + ")";
                        break;
                }
            }
        }
        return str;
    }
    isometric(val) {
        if (val !== undefined) {
            this._renderMode = val ? IgeEntityRenderMode.iso : IgeEntityRenderMode.flat;
            return this;
        }
        return this._renderMode === IgeEntityRenderMode.iso;
    }
    /**
     * Destroys the entity by removing it from the scenegraph,
     * calling destroy() on any child entities and removing
     * any active event listeners for the entity. Once an entity
     * has been destroyed it's this._alive flag is also set to
     * false.
     * @example #Destroy the entity
     *     entity.destroy();
     */
    destroy() {
        this._alive = false;
        // Check if the entity is streaming
        if (isServer && this._streamMode === IgeStreamMode.simple) {
            this._streamDataCache = "";
            this.streamDestroy();
        }
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
        ige.register.remove(this);
        // Set a flag in case a reference to this object
        // has been held somewhere, shows that the object
        // should no longer be interacted with
        this._alive = false;
        // Remove the event listeners array in case any
        // object references still exist there
        this._eventListeners = {};
        return this;
    }
    /**
     * Sorts the _children array by the layer and then depth of each object.
     */
    depthSortChildren() {
        if (this._depthSortMode === IgeIsometricDepthSortMode.none) {
            return;
        }
        if (this._mountMode === IgeMountMode.flat) {
            // The mount mode for this entity is a 2d plane or "flat" mode, so we don't have any
            // isometric rendering to deal with and as such, just called the IgeObject version
            // of this method because IgeObject as a base class has no understanding of isometric
            // mounting since IgeObject instances don't actually render anything. This will use
            // the layer and depth of each object to sort against each other.
            return super.depthSortChildren();
        }
        const arr = this._children;
        let arrCount = arr.length;
        if (!arr || !arrCount) {
            return;
        }
        if (this._depthSortMode === IgeIsometricDepthSortMode.bounds3d) {
            // Slowest, uses 3d bounds
            // Calculate depths from 3d bounds
            const sortObj = {
                adj: [],
                c: [],
                p: [],
                order: [],
                order_ind: arrCount - 1
            };
            for (let i = 0; i < arrCount; ++i) {
                const childItemA = arr[i];
                sortObj.c[i] = 0;
                sortObj.p[i] = -1;
                sortObj.adj[i] = sortObj.adj[i] || [];
                for (let j = i + 1; j < arrCount; ++j) {
                    const childItemB = arr[j];
                    sortObj.adj[j] = sortObj.adj[j] || [];
                    if (childItemA._inView && childItemB._inView && "_projectionOverlap" in childItemA && "_projectionOverlap" in childItemB) {
                        if (childItemA._projectionOverlap(childItemB)) {
                            if (childItemA.isBehind(childItemB)) {
                                sortObj.adj[j].push(i);
                            }
                            else {
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
                }
                else {
                    // Not on same layer so sort by layer
                    return layerIndex;
                }
            });
        }
        if (this._depthSortMode === IgeIsometricDepthSortMode.cuboid) {
            // Medium speed, optimised for almost-cube shaped 3d bounds
            // Now sort the entities by depth
            this._sortChildren((a, b) => {
                const layerIndex = b._layer - a._layer;
                if (layerIndex === 0) {
                    // On same layer so sort by depth
                    //if (a._projectionOverlap(b)) {
                    if (a.isBehind(b)) {
                        return -1;
                    }
                    else {
                        return 1;
                    }
                    //}
                }
                else {
                    // Not on same layer so sort by layer
                    return layerIndex;
                }
            });
        }
        if (this._depthSortMode === IgeIsometricDepthSortMode.cube) {
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
                }
                else {
                    // Not on same layer so sort by layer
                    return layerIndex;
                }
            });
        }
    }
    pointerMove(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerMove = undefined;
            }
            else {
                this._pointerMove = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerMove;
    }
    pointerOver(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerOver = undefined;
            }
            else {
                this._pointerOver = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerOver;
    }
    pointerOut(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerOut = undefined;
            }
            else {
                this._pointerOut = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerOut;
    }
    pointerUp(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerUp = undefined;
            }
            else {
                this._pointerUp = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerUp;
    }
    pointerDown(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerDown = undefined;
            }
            else {
                this._pointerDown = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerDown;
    }
    pointerWheel(callback) {
        if (callback !== undefined) {
            if (callback === null) {
                this._pointerWheel = undefined;
            }
            else {
                this._pointerWheel = callback;
            }
            this._pointerEventsActive = true;
            return this;
        }
        return this._pointerWheel;
    }
    /**
     * Removes the callback that is fired when a mouse
     * move event is triggered.
     */
    pointerMoveOff() {
        delete this._pointerMove;
        return this;
    }
    /**
     * Removes the callback that is fired when a mouse
     * over event is triggered.
     */
    pointerOverOff() {
        delete this._pointerOver;
        return this;
    }
    /**
     * Removes the callback that is fired when a mouse
     * out event is triggered.
     */
    pointerOutOff() {
        delete this._pointerOut;
        return this;
    }
    /**
     * Removes the callback that is fired when a mouse
     * up event is triggered.
     */
    pointerUpOff() {
        delete this._pointerUp;
        return this;
    }
    /**
     * Removes the callback that is fired when a mouse
     * down event is triggered if the listener was registered
     * via the pointerDown() method.
     */
    pointerDownOff() {
        delete this._pointerDown;
        return this;
    }
    /**
     * Removes the callback that is fired when a mouse
     * wheel event is triggered.
     */
    pointerWheelOff() {
        delete this._pointerWheel;
        return this;
    }
    triggerPolygonFunctionName(setting) {
        if (setting !== undefined) {
            this._triggerPolygonFunctionName = setting;
            return this;
        }
        return this._triggerPolygonFunctionName;
    }
    /**
     * Will return the polygon used when determining if a pointer event occurs
     * on this entity.
     */
    triggerPolygon() {
        return this[this._triggerPolygonFunctionName]();
    }
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
    debugTransforms() {
        this.log("Debug transforms enabled");
        traceSet(this._translate, "x", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._translate, "y", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._translate, "z", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._rotate, "x", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._rotate, "y", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._rotate, "z", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._scale, "x", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._scale, "y", 1, (val) => {
            return isNaN(val);
        });
        traceSet(this._scale, "z", 1, (val) => {
            return isNaN(val);
        });
        return this;
    }
    velocityTo(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._velocity.x = x;
            this._velocity.y = y;
            this._velocity.z = z;
        }
        else {
            this.log("velocityTo() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    velocityBy(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._velocity.x += x;
            this._velocity.y += y;
            this._velocity.z += z;
        }
        else {
            this.log("velocityBy() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Translates the entity by adding the passed values to
     * the current translation values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Translate the entity by 10 along the x axis
     *     entity.translateBy(10, 0, 0);
     * @return {*}
     */
    translateBy(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._translate.x += x;
            this._translate.y += y;
            this._translate.z += z;
        }
        else {
            this.log("translateBy() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Translates the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Translate the entity to 10, 0, 0
     *     entity.translateTo(10, 0, 0);
     * @return {*}
     */
    translateTo(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._translate.x = x;
            this._translate.y = y;
            this._translate.z = z;
        }
        else {
            this.log("translateTo() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
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
    translateToPoint(point) {
        if (point !== undefined) {
            this._translate.x = point.x;
            this._translate.y = point.y;
            this._translate.z = point.z;
        }
        else {
            this.log("translateToPoint() called with a missing or undefined point parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Translates the object to the tile co-ordinates passed.
     * @param {number} x The x tile co-ordinate.
     * @param {number} y The y tile co-ordinate.
     * @param {number=} z The z tile co-ordinate.
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
    translateToTile(x, y, z) {
        if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
            let finalZ;
            // Handle being passed a z co-ordinate
            if (z !== undefined) {
                finalZ = z * this._parent._tileWidth;
            }
            else {
                finalZ = this._translate.z;
            }
            this.translateTo(x * this._parent._tileWidth + this._parent._tileWidth / 2, y * this._parent._tileHeight + this._parent._tileWidth / 2, finalZ);
        }
        else {
            this.log("Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.", "warning");
        }
        return this;
    }
    /**
     * Gets the `translate` accessor object.
     * @example #Use the `translate` accessor object to alter the y co-ordinate of the entity to 10
     *     entity.translate().y(10);
     * @return {*}
     */
    translate(...args) {
        if (args.length) {
            throw new Error("You called translate with arguments, did you mean translateTo or translateBy instead of translate?");
        }
        // used to be this._entity || { x, y z }
        return ({
            x: this._translateAccessorX,
            y: this._translateAccessorY,
            z: this._translateAccessorZ
        });
    }
    _translateAccessorX(val) {
        if (val !== undefined) {
            this._translate.x = val;
            return this; // Used to include this._entity
        }
        return this._translate.x;
    }
    _translateAccessorY(val) {
        if (val !== undefined) {
            this._translate.y = val;
            return this; // Used to include this._entity
        }
        return this._translate.y;
    }
    _translateAccessorZ(val) {
        // TODO: Do we need to do anything to the matrix here for iso views?
        //this._localMatrix.translateTo(this._translate.x, this._translate.y);
        if (val !== undefined) {
            this._translate.z = val;
            return this; // Used to include this._entity
        }
        return this._translate.z;
    }
    /**
     * Rotates the entity by adding the passed values to
     * the current rotation values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Rotate the entity by 10 degrees about the z axis
     *     entity.rotateBy(0, 0, degreesToRadians(10));
     * @return {*}
     */
    rotateBy(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._rotate.x += x;
            this._rotate.y += y;
            this._rotate.z += z;
        }
        else {
            this.log("rotateBy() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Rotates the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Rotate the entity to 10 degrees about the z axis
     *     entity.rotateTo(0, 0, degreesToRadians(10));
     * @return {*}
     */
    rotateTo(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._rotate.x = x;
            this._rotate.y = y;
            this._rotate.z = z;
        }
        else {
            this.log("rotateTo() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Gets the `translate` accessor object.
     * @example #Use the `rotate` accessor object to rotate the entity about the z-axis 10 degrees
     *     entity.rotate().z(degreesToRadians(10));
     * @return {*}
     */
    rotate(...args) {
        if (args.length) {
            throw new Error("You called rotate with arguments, did you mean rotateTo or rotateBy instead of rotate?");
        }
        // used to be this._entity || { x, y z }
        return ({
            x: this._rotateAccessorX,
            y: this._rotateAccessorY,
            z: this._rotateAccessorZ
        });
    }
    _rotateAccessorX(val) {
        if (val !== undefined) {
            this._rotate.x = val;
            return this; // Used to include this._entity
        }
        return this._rotate.x;
    }
    _rotateAccessorY(val) {
        if (val !== undefined) {
            this._rotate.y = val;
            return this; // Used to include this._entity
        }
        return this._rotate.y;
    }
    _rotateAccessorZ(val) {
        if (val !== undefined) {
            this._rotate.z = val;
            return this; // Used to include this._entity
        }
        return this._rotate.z;
    }
    /**
     * Scales the entity by adding the passed values to
     * the current scale values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Scale the entity by 2 on the x-axis
     *     entity.scaleBy(2, 0, 0);
     * @return {*}
     */
    scaleBy(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._scale.x += x;
            this._scale.y += y;
            this._scale.z += z;
        }
        else {
            this.log("scaleBy() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Scale the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Set the entity scale to 1 on all axes
     *     entity.scaleTo(1, 1, 1);
     * @return {*}
     */
    scaleTo(x, y, z) {
        if (x === undefined || y === undefined || z === undefined) {
            this.log("scaleTo() called with a missing or undefined x, y or z parameter!", "error");
            return this;
        }
        this._scale.x = x;
        this._scale.y = y;
        this._scale.z = z;
        return this; // Used to include this._entity
    }
    /**
     * Gets the `scale` accessor object.
     * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
     *     entity.scale().x(1);
     * @return {*}
     */
    scale(...args) {
        if (args.length) {
            throw new Error("You called scale with arguments, did you mean scaleTo or scaleBy instead of scale?");
        }
        // used to be this._entity || { x, y z }
        return ({
            x: this._scaleAccessorX,
            y: this._scaleAccessorY,
            z: this._scaleAccessorZ
        });
    }
    _scaleAccessorX(val) {
        if (val !== undefined) {
            this._scale.x = val;
            return this; // Used to include this._entity
        }
        return this._scale.x;
    }
    _scaleAccessorY(val) {
        if (val !== undefined) {
            this._scale.y = val;
            return this; // Used to include this._entity
        }
        return this._scale.y;
    }
    _scaleAccessorZ(val) {
        if (val !== undefined) {
            this._scale.z = val;
            return this; // Used to include this._entity
        }
        return this._scale.z;
    }
    /**
     * Sets the `origin` of the entity by adding the passed values to
     * the current origin values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Add 0.5 to the origin on the x-axis
     *     entity.originBy(0.5, 0, 0);
     * @return {*}
     */
    originBy(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._origin.x += x;
            this._origin.y += y;
            this._origin.z += z;
        }
        else {
            this.log("originBy() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Set the `origin` of the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Set the entity origin to 0.5 on all axes
     *     entity.originTo(0.5, 0.5, 0.5);
     * @return {*}
     */
    originTo(x, y, z) {
        if (x !== undefined && y !== undefined && z !== undefined) {
            this._origin.x = x;
            this._origin.y = y;
            this._origin.z = z;
        }
        else {
            this.log("originTo() called with a missing or undefined x, y or z parameter!", "error");
        }
        return this; // Used to include this._entity
    }
    /**
     * Gets the `origin` accessor object.
     * @example #Use the origin accessor object to set the origin of the entity on the x-axis to 1
     *     entity.origin().x(1);
     * @return {*}
     */
    origin() {
        // used to be this._entity || { x, y z }
        return ({
            x: this._originAccessorX,
            y: this._originAccessorY,
            z: this._originAccessorZ
        });
    }
    _originAccessorX(val) {
        if (val !== undefined) {
            this._origin.x = val;
            return this; // Used to include this._entity
        }
        return this._origin.x;
    }
    _originAccessorY(val) {
        if (val !== undefined) {
            this._origin.y = val;
            return this; // Used to include this._entity
        }
        return this._origin.y;
    }
    _originAccessorZ(val) {
        if (val !== undefined) {
            this._origin.z = val;
            return this; // Used to include this._entity
        }
        return this._origin.z;
    }
    _rotatePoint(point, radians, origin) {
        const cosAngle = Math.cos(radians), sinAngle = Math.sin(radians);
        return {
            x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
            y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
        };
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // INTERPOLATOR
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Calculates the current value based on the time along the
     * value range.
     * @param {number} startValue The value that the interpolation started from.
     * @param {number} endValue The target value to be interpolated to.
     * @param {number} startTime The time the interpolation started.
     * @param {number} currentTime The current time.
     * @param {number} endTime The time the interpolation will end.
     * @return {number} The interpolated value.
     */
    interpolateValue(startValue, endValue, startTime, currentTime, endTime) {
        const totalValue = endValue - startValue;
        const dataDelta = endTime - startTime;
        const offsetDelta = currentTime - startTime;
        let deltaTime = offsetDelta / dataDelta;
        // Clamp the current time from 0 to 1
        if (deltaTime < 0) {
            deltaTime = 0;
        }
        else if (deltaTime > 1) {
            deltaTime = 1;
        }
        return totalValue * deltaTime + startValue;
    }
    /**
     * Processes the time stream for the entity.
     * @param {number} renderTime The time that the time stream is
     * targeting to render the entity at.
     * @param {number} maxLerp The maximum lerp before the value
     * is assigned directly instead of being interpolated.
     * @private
     */
    _processInterpolate(renderTime, maxLerp = 200) {
        // Set the maximum lerp to 200 if none is present
        if (!maxLerp) {
            maxLerp = 200;
        }
        //const maxLerpSquared = maxLerp * maxLerp;
        const timeStream = this._timeStream;
        const currentTransform = [];
        let previousData, nextData, dataDelta, offsetDelta, currentTime, previousTransform, nextTransform, i = 1;
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
        }
        else {
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
            previousTransform = previousData[1].map(parseFloat);
            nextTransform = nextData[1].map(parseFloat);
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
    _highlightToGlobalCompositeOperation(val) {
        if (val) {
            return "lighter";
        }
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
     * @param {number} tickDelta The delta between the last tick time and this one.
     */
    update(ctx, tickDelta) {
        var _a;
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
            this._streamDataCache = "";
            // Process any behaviours assigned to the entity
            this._processBehaviours(IgeBehaviourType.preUpdate, ctx, tickDelta);
            // Process velocity
            if (this._velocity.x || this._velocity.y) {
                this._translate.x += (this._velocity.x / 16) * tickDelta;
                this._translate.y += (this._velocity.y / 16) * tickDelta;
            }
            if (this._timeStream.length) {
                // Process any interpolation
                this._processInterpolate(ige.engine._tickStart - ige.network._renderLatency);
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
        }
        else {
            // The entity is not yet born, unmount it and add to the spawn queue
            this._birthMount = (_a = this._parent) === null || _a === void 0 ? void 0 : _a.id();
            this.unMount();
            ige.engine.spawnQueue(this);
        }
        // Process super class
        super.update(ctx, tickDelta);
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
    streamSectionData(sectionId, data, bypassTimeStream = false, bypassChangeDetection = false) {
        switch (sectionId) {
            case "bounds2d":
                if (data !== undefined) {
                    if (isClient) {
                        const geom = data.split(",");
                        this.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
                    }
                }
                else {
                    return String(this._bounds2d.x + "," + this._bounds2d.y);
                }
                break;
            case "bounds3d":
                if (data !== undefined) {
                    if (isClient) {
                        const geom = data.split(",");
                        this.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
                    }
                }
                else {
                    return String(this._bounds3d.x + "," + this._bounds3d.y + "," + this._bounds3d.z);
                }
                break;
            case "hidden":
                if (data !== undefined) {
                    if (isClient) {
                        if (data === "true") {
                            this.hide();
                        }
                        else {
                            this.show();
                        }
                    }
                }
                else {
                    return String(this.isHidden());
                }
                break;
            case "width":
                if (data !== undefined) {
                    if (isClient) {
                        this.width(parseInt(data));
                    }
                }
                else {
                    return String(this.width());
                }
                break;
            case "height":
                if (data !== undefined) {
                    if (isClient) {
                        this.height(parseInt(data));
                    }
                }
                else {
                    return String(this.height());
                }
                break;
            default:
                return super.streamSectionData(sectionId, data, bypassTimeStream, bypassChangeDetection);
        }
    }
}
registerClass(IgeEntity);
