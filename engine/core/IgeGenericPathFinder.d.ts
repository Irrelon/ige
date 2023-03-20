import { IgeEventingClass } from "./IgeEventingClass";
declare enum ListType {
    "closed" = 0,
    "open" = 1
}
export interface IgeGenericPathFinderNode {
    _id: string;
    x: number;
    y: number;
    cost: number;
    listType?: ListType;
    link?: IgeGenericPathFinderNode;
}
/**
 * Creates a new path using the A* path-finding algorithm.
 */
export declare class IgeGenericPathFinder extends IgeEventingClass {
    classId: string;
    _neighbourLimit: number;
    /**
     * Gets / sets the limit on the number of neighbour nodes
     * that the pathfinder will analyse before reaching its
     * target tile. On large maps this limit should be increased
     * to allow pathing where many neighbours need to be
     * considered.
     * @param val
     * @return {*}
     */
    neighbourLimit(val?: number): number | this;
    isTraversalAllowed(newX: number, newY: number, currentNode?: IgeGenericPathFinderNode | null, x?: number | null, y?: number | null, dynamic?: boolean): boolean;
    getConnections(currentNode: IgeGenericPathFinderNode, targetNode: IgeGenericPathFinderNode): IgeGenericPathFinderNode[];
    /**
     * Uses the A* algorithm to generate path data between two points.
     * @param {IgeCollisionMap2d} tileMap The tile map to use when generating the path.
     * @param {IgePoint3d} startPoint The point on the map to start path-finding from.
     * @param {IgePoint3d} endPoint The point on the map to try to path-find to.
     * @param {Function} isTraversalAllowed The callback function that will decide if each tile that is being considered for use in the path is allowed or not based on the tile map's data stored for that tile which is passed to this method as the first parameter. Must return a boolean value.
     * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis. Defaults to true if undefined.
     * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis. Defaults to false if undefined.
     * @param {Boolean=} allowInvalidDestination If the pathfinder cannot path to the destination tile, if this is true the closest path will be returned instead.
     * @return {Array} An array of objects each containing an x, y co-ordinate that describes the path from the starting point to the end point in order.
     */
    generate(startPoint: IgeGenericPathFinderNode, endPoint: IgeGenericPathFinderNode, allowInvalidDestination?: boolean): IgeGenericPathFinderNode[];
    /**
     * The heuristic to calculate the rough cost of pathing from the
     * x1, y1 to x2, y2.
     * @param {Number} x1 The first x co-ordinate.
     * @param {Number} y1 The first y co-ordinate.
     * @param {Number} x2 The second x co-ordinate.
     * @param {Number} y2 The second y co-ordinate.
     * @param {Number} moveCost The cost multiplier to multiply by.
     * @return {Number} Returns the heuristic cost between the co-ordinates specified.
     * @private
     */
    cost(x1: number, y1: number, x2: number, y2: number, moveCost?: number): number;
}
export {};
