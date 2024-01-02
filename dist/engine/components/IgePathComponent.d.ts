import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgePathFinder, IgePathFinderComparisonCallback } from "../core/IgePathFinder.js"
import { IgePathNode } from "../core/IgePathNode.js"
import { IgePoint3d } from "../core/IgePoint3d.js"
import type { IgeTileMap2d } from "../core/IgeTileMap2d.js"
import type { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour.js"
/**
 * Handles entity path traversal. This component is supposed to be added
 * to individual entities wishing to traverse paths. When added to an entity
 * the component will add a behaviour to the entity that is called each update()
 * and will operate to move the entity along a defined path.
 */
export declare class IgePathComponent extends IgeComponent {
    classId: string;
    componentId: string;
    _tileMap?: IgeTileMap2d;
    _finder?: IgePathFinder;
    _dynamic: boolean;
    _tileChecker: IgePathFinderComparisonCallback;
    _lookAheadSteps?: number;
    _allowSquare: boolean;
    _allowDiagonal: boolean;
    _points: IgePathNode[];
    _speed: number;
    _nextPointToProcess: number;
    _previousPointFrom: number;
    _currentPointFrom: number;
    _previousPointTo: number;
    _currentPointTo: number;
    _finished: boolean;
    _warnTime?: number;
    _active: boolean;
    _autoStop: boolean;
    _startTime?: number;
    _paused: boolean;
    _pauseTime?: number;
    _drawPath: boolean;
    _drawPathGlow: boolean;
    _drawPathText: boolean;
    _totalDistance?: number;
    _totalTime?: number;
    constructor(entity: IgeEntity, options?: any);
    /**
     * Gets / sets the tile map that will be used when calculating paths.
     * @param {IgeTileMap2d} val The tileMap to use for path calculations.
     * @returns {*}
     */
    tileMap: (val?: IgeTileMap2d) => IgeTileMap2d | this | undefined;
    /**
     * Gets / sets the pathfinder class instance used to generate paths.
     * @param {IgePathFinder} val The pathfinder class instance to use to generate paths.
     * @returns {*}
     */
    finder: (val?: IgePathFinder) => IgePathFinder | this | undefined;
    /**
     * Gets / sets the dynamic mode enabled flag. If dynamic mode is enabled
     * then at the end of every path point (reaching a tile along the path)
     * the pathfinder will evaluate the path by looking ahead and seeing if
     * the path has changed (the tiles along the path have now been marked as
     * cannot path on). If any tile along the path up to the look-ahead value
     * has been blocked, the path will auto re-calculate to avoid the new block.
     *
     * For dynamic mode to work you need to supply a pathfinder instance by
     * calling .finder(), a tile checker method by calling .tileChecker() and
     * the number of look-ahead steps by calling .lookAheadSteps(). See the
     * doc for those methods for usage and required arguments.
     * @param {boolean} enable If set to true, enables dynamic mode.
     * @returns {*}
     */
    dynamic: (enable?: boolean) => boolean | this;
    /**
     * Gets / sets the tile checker method used when calculating paths.
     * @param {Function=} val The method to call when checking if a tile is valid
     * to traverse when calculating paths.
     * @returns {*}
     */
    tileChecker: (val?: IgePathFinderComparisonCallback) => IgePathFinderComparisonCallback | this;
    lookAheadSteps: (val?: number) => number | this | undefined;
    /**
     * Gets / sets the flag determining if a path can use N, S, E and W movement.
     * @param {boolean=} val Set to true to allow, false to disallow.
     * @returns {*}
     */
    allowSquare: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the flag determining if a path can use NW, SW, NE and SE movement.
     * @param {boolean=} val Set to true to allow, false to disallow.
     * @returns {*}
     */
    allowDiagonal: (val?: boolean) => boolean | this;
    /**
     * Clears any existing path points and sets the path the entity will traverse
     * from start to finish.
     * @param {number} fromX The x tile to path from.
     * @param {number} fromY The y tile to path from.
     * @param {number} fromZ The z tile to path from.
     * @param {number} toX The x tile to path to.
     * @param {number} toY The y tile to path to.
     * @param {number} toZ The z tile to path to.
     * @param {boolean=} findNearest If the destination is unreachable, when set to
     * true this option will allow the pathfinder to return the closest path to the
     * destination tile.
     * @returns {*}
     */
    set: (fromX: number, fromY: number, fromZ: number, toX: number, toY: number, toZ: number, findNearest?: boolean) => this;
    add: (x: number, y: number, z: number, findNearest?: boolean) => this;
    /**
     * Sets a new destination for a path including the point currently being traversed if a path is active
     * This creates a smooth transition and flow of pointComplete events between the old and new paths
     * @param {number} x The x tile to path to.
     * @param {number} y The y tile to path to.
     * @param {number} z The z tile to path to.
     * @param {boolean=} findNearest If the destination is unreachable, when set to
     * true this option will allow the pathfinder to return the closest path to the
     * destination tile.
     * @returns {*}
     */
    reRoute: (x: number, y: number, z: number, findNearest?: boolean) => this;
    /**
     * Adds a path array containing path points (IgePoint3d instances) to the points queue.
     * @param {Array} path An array of path points.
     * @return {*}
     */
    addPoints: (path?: IgePathNode[]) => this;
    /**
     * Gets the path node point that the entity is travelling from.
     * @return {IgePathNode} A new point representing the travelled from node.
     */
    getFromPoint: () => IgePathNode;
    /**
     * Gets the path node point that the entity is travelling to.
     * @return {IgePathNode} A new point representing the travelling to node.
     */
    getToPoint: () => IgePathNode;
    /**
     * Gets the current direction.
     * @example #Get the direction of movement along the current path
     *     // Create an entity and add the path component
     *     var entity = new IgeEntity()
     *         .addComponent(IgePathComponent);
     *
     *     // Create a path and add it to the entity
     *     // ...
     *     // Now get the current direction
     *     var direction = entity.path.currentDirection();
     * @return {string} A string such as N, S, E, W, NW, NE, SW, SE.
     * If there is currently no direction then the return value is a blank string.
     */
    getDirection: () => string;
    /**
     * Gets / sets the time towards the end of the path when the path
     * component will emit a "almostComplete" event.
     * @param {number=} ms The time in milliseconds to emit the event
     * on before the end of the path.
     * @return {*}
     */
    warnTime: (ms?: number) => number | this | undefined;
    /**
     * Gets / sets the flag determining if the entity moving along
     * the path will stop automatically at the end of the path.
     * @param {boolean=} val If true, will stop at the end of the path.
     * @return {*}
     */
    autoStop: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the speed at which the entity will traverse the path in pixels
     * per second (world space).
     * @param {number=} val
     * @param startTime
     * @return {*}
     */
    speed: (val?: number, startTime?: number) => number | this;
    /**
     * Starts path traversal.
     * @param {number=} startTime The time to start path traversal. Defaults
     * to `ige.engine._currentTime` if no value is presented.
     * @return {*}
     */
    start: (startTime?: number) => this;
    /**
     * Restarts an existing path traversal, for example after we have changed the speed or given it a new set of points
     * but don't want to consider it a new path and raise a new start event
     * @param {number=} startTime The time to start path traversal. Defaults
     * to ige.engine._currentTime if no value is presented.
     * @return {*}
     */
    restart: (startTime?: number) => this;
    /**
     * Returns the last point of the last path in the path queue.
     * @return {IgePoint3d}
     */
    getEndPoint: () => IgePathNode;
    /**
     * Pauses path traversal but does not clear the path queue or any path data.
     * @return {*}
     */
    pause: () => this;
    /**
     * Clears all path queue and path data.
     * @return {*}
     */
    clear: () => this;
    /**
     * Stops path traversal but does not clear the path
     * queue or any path data.
     * @return {*}
     */
    stop: () => this;
    /**
     * Gets / sets the flag determining if the path component
     * should draw the current path of the entity to the canvas
     * on each tick. Useful for debugging paths.
     * @param {boolean=} val If true, will draw the path.
     * @return {*}
     */
    drawPath: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the flag that determines if the path that
     * is drawn gets some added glow effects or not. Pure eye
     * candy, completely pointless otherwise.
     * @param {boolean=} val If true will add glow effects to the path.
     * @return {*}
     */
    drawPathGlow: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the flag that determines if the path that
     * is drawn gets some added labels or not.
     * @param {boolean=} val If true will draw labels on each path point.
     * @return {*}
     */
    drawPathText: (val?: boolean) => boolean | this;
    multiplyPoint: (point: IgePathNode | IgePoint3d) => IgePoint3d;
    dividePoint: (point: IgePathNode | IgePoint3d) => IgePoint3d;
    transformPoint: (point: IgePathNode | IgePoint3d) => IgePoint3d;
    unTransformPoint: (point: IgePathNode | IgePoint3d) => IgePoint3d;
    /**
     * The behaviour method executed each tick.
     * @param entity
     * @param {CanvasRenderingContext2D} ctx The canvas that is currently being
     * rendered to.
     * @private
     */
    _updateBehaviour: IgeEntityBehaviourMethod;
    _processDynamic: (pointFrom: IgePathNode, pointTo: IgePathNode, destinationPoint: IgePathNode) => boolean | -1;
    _calculatePathData: () => this;
    /**
     * Replaces a number of points in the current queue with the new points passed.
     * @param {number} fromIndex The from index.
     * @param {number} replaceLength The number of points to replace.
     * @param {Array} newPoints The array of new points to insert.
     */
    replacePoints: (fromIndex: number, replaceLength: number, newPoints: IgePathNode[]) => void;
    _tickBehaviour: IgeEntityBehaviourMethod;
    getPreviousPoint: (val?: number) => IgePathNode;
    getNextPoint: (val?: number) => IgePathNode;
    /**
     * Calculates the position of the entity along a vector based on the speed
     * of the entity and the delta time.
     * @param {IgePoint3d} p1 Vector start point
     * @param {IgePoint3d} p2 Vector end point
     * @param {number} speed Speed along the vector
     * @param {number} deltaTime The time between the last update and now.
     * @return {IgePoint3d}
     * @private
     */
    _positionAlongVector: (p1: IgePoint3d, p2: IgePoint3d, speed: number, deltaTime: number) => any;
}
