import { IgeObject } from "./IgeObject.js"
import { IgePoint2d } from "./IgePoint2d.js"
import { IgePoint3d } from "./IgePoint3d.js"
import { IgeRect } from "./IgeRect.js"
import type { IgeTexture } from "./IgeTexture.js"
import type { IgeViewport } from "./IgeViewport.js"
import { IgeEntityRenderMode } from "../../enums/IgeEntityRenderMode.js"
import type { IgeCanRegisterByCategory } from "../../types/IgeCanRegisterByCategory.js"
import type { IgeCanRegisterById } from "../../types/IgeCanRegisterById.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgeInputEvent } from "../../types/IgeInputEvent.js"
import type { IgeInputEventControl } from "../../types/IgeInputEventControl.js"
import type { IgePoint } from "../../types/IgePoint.js"
import type { IgePolygonFunctionality } from "../../types/IgePolygonFunctionality.js"
import type { IgeSmartTexture } from "../../types/IgeSmartTexture.js"
export interface IgeEntityTransformAccessor {
    x: (val?: number) => number | IgeEntity;
    y: (val?: number) => number | IgeEntity;
    z: (val?: number) => number | IgeEntity;
}
/**
 * Creates an entity and handles the entity's life cycle and
 * all related entity actions / methods.
 */
export declare class IgeEntity extends IgeObject implements IgeCanRegisterById, IgeCanRegisterByCategory {
    classId: string;
    _renderMode: IgeEntityRenderMode;
    _parent: IgeObject | null;
    _children: IgeObject[];
    _translateIso?: IgePoint3d | {
        x: number;
        y: number;
    };
    _textureOffset?: IgePoint2d;
    constructor();
    _sortChildren: (comparatorFunction: (a: any, b: any) => number) => void;
    /**
     * Calculates the distance to the passed entity from this one.
     * @param {IgeEntity} entity The entity to calculate distance
     * to.
     * @returns {number} Distance.
     */
    distanceTo(entity: IgeEntity): number;
    /**
     * Clones the object and all its children and returns a new object.
     */
    clone(options?: Record<string, boolean>): any;
    /**
     * Checks the current transform values against the previous ones. If
     * any value is different, the appropriate method is called which will
     * update the transformation matrix accordingly.
     */
    updateTransform(): this;
    /**
     * Sets the entity as visible and able to be interacted with.
     * @example #Show a hidden entity
     *     entity.show();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
    show(): this;
    /**
     * Sets the entity as hidden and cannot be interacted with.
     * @example #Hide a visible entity
     *     entity.hide();
     * @return {*} The object this method was called from to allow
     * method chaining.
     */
    hide(): this;
    /**
     * Checks if the entity is visible.
     * @returns {boolean} True if the entity is visible.
     */
    isVisible(): boolean;
    /**
     * Checks if the entity is hidden.
     * @returns {boolean} True if the entity is hidden.
     */
    isHidden(): boolean;
    /**
     * When using the caching system, this boolean determines if the
     * cache canvas should have image smoothing enabled or not. If
     * not set, the ige global smoothing setting will be used instead.
     * @param {Boolean=} val True to enable smoothing, false to disable.
     * @returns {*}
     */
    cacheSmoothing(val: boolean): this;
    cacheSmoothing(): boolean;
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
    mousePos(viewport?: IgeViewport | null): IgePoint3d;
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
    mousePosAbsolute(viewport?: IgeViewport | null): IgePoint3d;
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
    mousePosWorld(viewport?: IgeViewport | null): IgePoint3d;
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
    rotateToPoint(point: IgePoint3d): this;
    /**
     * Gets / sets the texture to use as the background
     * pattern for this entity.
     * @param {IgeTexture} texture The texture to use as
     * the background.
     * @param {string=} repeat The type of repeat mode either: "repeat",
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
    backgroundPattern(texture: IgeTexture, repeat?: string, trackCamera?: boolean, isoTile?: boolean): this;
    backgroundPattern(): IgeTexture;
    smartBackground(): IgeSmartTexture | undefined;
    smartBackground(renderMethod?: IgeSmartTexture): this;
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
    widthByTile(val: number, lockAspect?: boolean): this;
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
    heightByTile(val: number, lockAspect?: boolean): this;
    /**
     * Adds the object to the tile map at the passed tile co-ordinates. If
     * no tile co-ordinates are passed, will use the current tile position
     * and the tileWidth() and tileHeight() values.
     * @param {number=} x X co-ordinate of the tile to occupy.
     * @param {number=} y Y co-ordinate of the tile to occupy.
     * @param {number=} width Number of tiles along the x-axis to occupy.
     * @param {number=} height Number of tiles along the y-axis to occupy.
     */
    occupyTile(x?: number, y?: number, width?: number, height?: number): this;
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
    unOccupyTile(x?: number, y?: number, width?: number, height?: number): this;
    /**
     * Returns an array of tile co-ordinates that the object is currently
     * over, calculated using the current world co-ordinates of the object
     * as well as its 3d geometry.
     * @private
     * @return {Array} The array of tile co-ordinates as IgePoint3d instances.
     */
    overTiles(): IgePoint3d[] | undefined;
    /**
     * Gets / sets the anchor position that this entity's texture
     * will be adjusted by.
     * @param {number=} x The x anchor value.
     * @param {number=} y The y anchor value.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    anchor(x: number, y: number): this;
    anchor(): IgePoint2d;
    /**
     * Gets / sets the geometry x value.
     * @param {number=} px The new x value in pixels.
     * @param {Boolean} lockAspect
     * @example #Set the entity width
     *     entity.width(40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    width(px: number | string, lockAspect?: boolean): this;
    width(px: number | string, lockAspect: boolean): this;
    width(): number | string;
    /**
     * Gets / sets the geometry y value.
     * @param {number=} px The new y value in pixels.
     * @param {boolean} [lockAspect]
     * @example #Set the entity height
     *     entity.height(40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    height(px: number | string, lockAspect?: boolean): this;
    height(): number;
    /**
     * Gets / sets the 2d geometry of the entity. The x and y values are
     * relative to the center of the entity. This geometry is used when
     * rendering textures for the entity and positioning in world space as
     * well as UI positioning calculations. It holds no bearing on isometric
     * positioning.
     * @param {number=} x The new x value in pixels.
     * @param {number=} y The new y value in pixels.
     * @example #Set the dimensions of the entity (width and height)
     *     entity.bounds2d(40, 40);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    bounds2d(x: number, y: number): this;
    bounds2d(): IgePoint2d;
    bounds2d(x: IgePoint2d): this;
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
    /**
     * Gets / sets the timestamp in milliseconds that denotes the time
     * that the entity will be destroyed. The object checks its own death
     * time during each tick and if the current time is greater than the
     * death time, the object will be destroyed.
     * @param {number=} val The death time timestamp. This is a time relative
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
    /**
     * Gets / sets the current texture cell used when rendering the game
     * object's texture. If the texture is not cell-based, this value is
     * ignored. This differs from cell() in that it accepts a string id
     * as the cell
     * @param {number=} val The cell id.
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
    cellById(val: string | number): this;
    cellById(): number | null;
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
    dimensionsFromTexture(percent?: number): this;
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
    dimensionsFromCell(percent?: number): this;
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
    highlight(val: boolean, highlightChildEntities?: boolean): this;
    highlight(): boolean;
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
    aabb(recalculate?: boolean, inverse?: boolean): IgeRect;
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
    localAabb(recalculate?: boolean): IgeRect | undefined;
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
    _swapVars(num1: number, num2: number): [number, number];
    _internalsOverlap(x0: number, x1: number, y0: number, y1: number): boolean;
    _projectionOverlap(otherObject: IgeEntity): boolean;
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
    isBehind(otherObject: IgeEntity): boolean;
    /**
     * Get / set the flag determining if this entity will respond
     * to mouse interaction or not. When you set a mouse* event e.g.
     * pointerUp, pointerOver etc this flag will automatically be reset
     * to true.
     * @param {Boolean=} val The flag value true or false.
     * @example #Set entity to ignore mouse events
     *     entity.pointerEventsActive(false);
     * @example #Set entity to receive mouse events
     *     entity.pointerEventsActive(true);
     * @example #Get current flag value
     *     var val = entity.pointerEventsActive();
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    pointerEventsActive(val: boolean): this;
    pointerEventsActive(): boolean;
    /**
     * Sets the _ignoreCamera internal flag to the value passed for this
     * and all child entities down the scenegraph.
     * @param val
     */
    ignoreCameraComposite(val: boolean): void;
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
    newFrame(): boolean;
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
    _transformContext(ctx: IgeCanvasRenderingContext2d, inverse?: boolean): void;
    pointerAlwaysInside(val: boolean): this;
    pointerAlwaysInside(): boolean;
    /**
     * Processes the actions required each render frame.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {Boolean} [dontTransform] If set to true, the tick method will
     * not transform the context based on the entity's matrices. This is useful
     * if you have extended the class and want to process down the inheritance
     * chain but have already transformed the entity in a previous overloaded
     * method.
     */
    tick(ctx: IgeCanvasRenderingContext2d, dontTransform?: boolean): void;
    _processTriggerHitTests(): any;
    _refreshCache(dontTransform?: boolean): void;
    /**
     * Handles calling the texture.render() method if a texture
     * is applied to the entity. This part of the tick process has
     * been abstracted to allow it to be overridden by an extending
     * class.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render
     * the entity to.
     * @private
     */
    _renderEntity(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Draws the cached off-screen canvas image data to the passed canvas
     * context.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render
     * the entity to.
     * @private
     */
    _renderCache(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Helper method to transform an array of points using _transformPoint.
     * @param {Array} points The points array to transform.
     * @private
     */
    _transformPoints(points: IgePoint[]): void;
    /**
     * Generates a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String} The string code fragment that will
     * reproduce this entity when evaluated.
     */
    stringify(options?: Record<string, boolean>): string;
    /**
     * Gets / sets if this object should be positioned isometrically
     * or in 2d.
     * isometric space or false to position it in 2d space.
     * @example #Set the positioning mode to isometric
     *     var entity = new IgeEntity()
     *         .isometric(true);
     * @example #Set the positioning mode to 2d
     *     var entity = new IgeEntity()
     *         .isometric(false);
     * @return {*}
     */
    isometric(val: boolean): this;
    isometric(): boolean;
    /**
     * Destroys the entity by removing it from the scenegraph,
     * calling destroy() on any child entities and removing
     * any active event listeners for the entity. Once an entity
     * has been destroyed it's this._alive flag is also set to
     * false.
     * @example #Destroy the entity
     *     entity.destroy();
     */
    destroy(): this;
    /**
     * Sorts the _children array by the layer and then depth of each object.
     */
    depthSortChildren(): void;
    /**
     * Gets / sets the callback that is fired when a mouse
     * move event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse move event and stop it propagating further down the scenegraph
     *     entity.pointerMove(function (event, control) {
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
    pointerMove(callback: IgeInputEvent | null): this;
    pointerMove(): IgeInputEvent;
    /**
     * Gets / sets the callback that is fired when a mouse
     * over event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse over event and stop it propagating further down the scenegraph
     *     entity.pointerOver(function (event, control) {
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
    pointerOver(callback: IgeInputEvent | null): this;
    pointerOver(): IgeInputEvent;
    /**
     * Gets / sets the callback that is fired when a mouse
     * out event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse out event and stop it propagating further down the scenegraph
     *     entity.pointerOut(function (event, control) {
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
    pointerOut(callback: IgeInputEvent | null): this;
    pointerOut(): IgeInputEvent;
    /**
     * Gets / sets the callback that is fired when a mouse
     * up event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse up event and stop it propagating further down the scenegraph
     *     entity.pointerUp(function (event, control) {
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
    pointerUp(callback: IgeInputEvent | null): this;
    pointerUp(): IgeInputEvent;
    /**
     * Gets / sets the callback that is fired when a mouse
     * down event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse down event and stop it propagating further down the scenegraph
     *     entity.pointerDown(function (event, control) {
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
    pointerDown(callback: IgeInputEvent | null): this;
    pointerDown(): IgeInputEvent;
    /**
     * Gets / sets the callback that is fired when a mouse
     * wheel event is triggered.
     * @param {Function=} callback
     * @example #Hook the mouse wheel event and stop it propagating further down the scenegraph
     *     entity.pointerWheel(function (event, control) {
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
    pointerWheel(callback: IgeInputEvent | null): this;
    pointerWheel(): IgeInputEvent;
    /**
     * Removes the callback that is fired when a mouse
     * move event is triggered.
     */
    pointerMoveOff(): this;
    /**
     * Removes the callback that is fired when a mouse
     * over event is triggered.
     */
    pointerOverOff(): this;
    /**
     * Removes the callback that is fired when a mouse
     * out event is triggered.
     */
    pointerOutOff(): this;
    /**
     * Removes the callback that is fired when a mouse
     * up event is triggered.
     */
    pointerUpOff(): this;
    /**
     * Removes the callback that is fired when a mouse
     * down event is triggered if the listener was registered
     * via the pointerDown() method.
     */
    pointerDownOff(): this;
    /**
     * Removes the callback that is fired when a mouse
     * wheel event is triggered.
     */
    pointerWheelOff(): this;
    /**
     * Sets the name of the function that will be called to return the polygon
     * used when determining if a pointer event occurs on this entity.
     * @param poly
     */
    triggerPolygonFunctionName(poly: "aabb" | "bounds3dPolygon" | "localBounds3dPolygon"): this;
    triggerPolygonFunctionName(): "aabb" | "bounds3dPolygon" | "localBounds3dPolygon";
    /**
     * Will return the polygon used when determining if a pointer event occurs
     * on this entity.
     */
    triggerPolygon(): IgePolygonFunctionality;
    /**
     * Gets / sets the shape / polygon that the mouse events
     * are triggered against. There are two options, 'aabb' and
     * 'isoBounds'. The default is 'aabb'.
     * @param val
     * @returns {*}
     * @deprecated Please use triggerPolygonFunctionName() instead
     */
    mouseEventTrigger: (val?: boolean) => void;
    /**
     * Handler method that determines which mouse-move event
     * to fire, a mouse-over or a mouse-move.
     * @private
     */
    _handleMouseIn: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
    /**
     * Handler method that determines if a mouse-out event
     * should be fired.
     * @private
     */
    _handleMouseOut: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
    /**
     * Handler method that determines if a mouse-wheel event
     * should be fired.
     * @private
     */
    _handleMouseWheel: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
    /**
     * Handler method that determines if a mouse-up event
     * should be fired.
     * @private
     */
    _handleMouseUp: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
    /**
     * Handler method that determines if a mouse-down event
     * should be fired.
     * @private
     */
    _handleMouseDown: (event: Event, evc?: IgeInputEventControl, data?: any) => void;
    /**
     * Checks mouse input types and fires the correct mouse event
     * handler. This is an internal method that should never be
     * called externally.
     * @param {Object} evc The input component event control object.
     * @param {Object} eventData Data passed by the input component into
     * the new event.
     * @private
     */
    _mouseInTrigger: (evc: IgeInputEventControl, eventData?: any) => void;
    /**
     * Enables tracing calls which inadvertently assign NaN values to
     * transformation properties. When called on an entity this system
     * will break with a debug line when a transform property is set
     * to NaN allowing you to step back through the call stack and
     * determine where the offending value originated.
     * @returns {IgeEntity}
     */
    debugTransforms(): this;
    velocityTo(x?: number, y?: number, z?: number): this;
    velocityBy(x?: number, y?: number, z?: number): this;
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
    translateBy(x: number, y: number, z: number): this;
    /**
     * Translates the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Translate the entity to 10, 0, 0
     *     entity.translateTo(10, 0, 0);
     * @return {*}
     */
    translateTo(x: number, y: number, z: number): this;
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
    translateToPoint(point: IgePoint3d): this;
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
    translateToTile(x: number, y: number, z: number): this;
    /**
     * Gets the `translate` accessor object.
     * @example #Use the `translate` accessor object to alter the y co-ordinate of the entity to 10
     *     entity.translate().y(10);
     * @return {*}
     */
    translate(...args: any[]): IgeEntityTransformAccessor;
    /**
     * The `translate` accessor method for the x-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _translateAccessorX(val: number): this;
    _translateAccessorX(): number;
    /**
     * The `translate` accessor method for the y-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _translateAccessorY(val: number): this;
    _translateAccessorY(): number;
    /**
     * The `translate` accessor method for the z-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.translate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _translateAccessorZ(val: number): this;
    _translateAccessorZ(): number;
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
    rotateBy(x?: number, y?: number, z?: number): this;
    /**
     * Rotates the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Rotate the entity to 10 degrees about the z axis
     *     entity.rotateTo(0, 0, degreesToRadians(10));
     * @return {*}
     */
    rotateTo(x: number, y: number, z: number): this;
    /**
     * Gets the `translate` accessor object.
     * @example #Use the `rotate` accessor object to rotate the entity about the z-axis 10 degrees
     *     entity.rotate().z(degreesToRadians(10));
     * @return {*}
     */
    rotate(...args: any[]): IgeEntityTransformAccessor;
    /**
     * The `rotate` accessor method for the x-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _rotateAccessorX(val: number): this;
    _rotateAccessorX(): number;
    /**
     * The `rotate` accessor method for the y-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _rotateAccessorY(val: number): this;
    _rotateAccessorY(): number;
    /**
     * The `rotate` accessor method for the z-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.rotate().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _rotateAccessorZ(val: number): this;
    _rotateAccessorZ(): number;
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
    scaleBy(x?: number, y?: number, z?: number): this;
    /**
     * Scale the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Set the entity scale to 1 on all axes
     *     entity.scaleTo(1, 1, 1);
     * @return {*}
     */
    scaleTo(x?: number, y?: number, z?: number): this;
    /**
     * Gets the `scale` accessor object.
     * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
     *     entity.scale().x(1);
     * @return {*}
     */
    scale(...args: any[]): IgeEntityTransformAccessor;
    /**
     * The `scale` accessor method for the x-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _scaleAccessorX(val: number): this;
    _scaleAccessorX(): number;
    /**
     * The `scale` accessor method for the y-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _scaleAccessorY(val: number): this;
    _scaleAccessorY(): number;
    /**
     * The `scale` accessor method for the z-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.scale().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _scaleAccessorZ(val: number): this;
    _scaleAccessorZ(): number;
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
    originBy(x?: number, y?: number, z?: number): this;
    /**
     * Set the `origin` of the entity to the passed values.
     * @param {number} x The x co-ordinate.
     * @param {number} y The y co-ordinate.
     * @param {number} z The z co-ordinate.
     * @example #Set the entity origin to 0.5 on all axes
     *     entity.originTo(0.5, 0.5, 0.5);
     * @return {*}
     */
    originTo(x?: number, y?: number, z?: number): this;
    /**
     * Gets the `origin` accessor object.
     * @example #Use the origin accessor object to set the origin of the entity on the x-axis to 1
     *     entity.origin().x(1);
     * @return {*}
     */
    origin(): IgeEntityTransformAccessor;
    /**
     * The `origin` accessor method for the x-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _originAccessorX(val: number): this;
    _originAccessorX(): number;
    /**
     * The `origin` accessor method for the y-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _originAccessorY(val: number): this;
    _originAccessorY(): number;
    /**
     * The `origin` accessor method for the z-axis. This
     * method is not called directly but is accessed through
     * the accessor object obtained by calling entity.origin().
     * @param {number=} val The new value to apply to the co-ordinate.
     * @return {*}
     * @private
     */
    _originAccessorZ(val: number): this;
    _originAccessorZ(): number;
    _rotatePoint(point: IgePoint2d, radians: number, origin: IgePoint2d): {
        x: number;
        y: number;
    };
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
    interpolateValue(startValue: number, endValue: number, startTime: number, currentTime: number, endTime: number): number;
    /**
     * Processes the time stream for the entity.
     * @param {number} renderTime The time that the time stream is
     * targeting to render the entity at.
     * @param {number} maxLerp The maximum lerp before the value
     * is assigned directly instead of being interpolated.
     * @private
     */
    _processInterpolate(renderTime: number, maxLerp?: number): void;
    _highlightToGlobalCompositeOperation(val: boolean): string | undefined;
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
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
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
}
