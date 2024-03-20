import type { IgeCollisionMap2d } from "./IgeCollisionMap2d.js"
import { IgeEventingClass } from "./IgeEventingClass.js";
import { IgePathNode } from "./IgePathNode.js"
import type { IgeTileMap2d } from "./IgeTileMap2d.js";
import type { IgePathFinderComparisonCallback } from "../../types/IgePathFinderComparisonCallback.js"
/**
 * Creates a new path using the A* path-finding algorithm.
 */
export declare class IgePathFinder extends IgeEventingClass {
    classId: string;
    _neighbourLimit: number;
    _squareCost: number;
    _diagonalCost: number;
    /**
     * Gets / sets the cost of movement over a square (left,
     * right, up, down) adjacent tile.
     * @param {number} [val]
     */
    squareCost(val: number): this;
    squareCost(): number;
    /**
     * Gets / sets the cost of movement over a diagonal (northwest,
     * northeast, southwest, southeast) adjacent tile.
     * @param {number} [val]
     */
    diagonalCost(val: number): this;
    diagonalCost(): number;
    /**
     * Gets / sets the limit on the number of neighbour nodes
     * that the pathfinder will analyse before reaching its
     * target tile. On large maps this limit should be increased
     * to allow pathing where many neighbours need to be
     * considered.
     * @param {number} [val]
     */
    neighbourLimit(val: number): this;
    neighbourLimit(): number;
    /**
     * @deprecated The "IgePathFinder.aStar" method has been renamed to "generate". Please update your code.
     */
    aStar(): void;
    /**
     * Uses the A* algorithm to generate path data between two points.
     * @param {IgeCollisionMap2d} tileMap The tile map to use when
     * generating the path.
     * @param {IgePoint3d} startPoint The point on the map to start
     * path-finding from.
     * @param {IgePoint3d} endPoint The point on the map to try to
     * path-find to.
     * @param {Function} comparisonCallback The callback function
     * that will decide if each tile that is being considered for use
     * in the path is allowed or not based on the tile map's data
     * stored for that tile which is passed to this method as the first
     * parameter. Must return a boolean value.
     * @param {Boolean} allowSquare Whether to allow neighboring
     * tiles along a square axis. Defaults to true if undefined.
     * @param {Boolean} allowDiagonal Whether to allow neighboring
     * tiles along a diagonal axis. Defaults to false if undefined.
     * @param {Boolean=} allowInvalidDestination If the pathfinder
     * cannot path to the destination tile, if this is true the
     * closest path will be returned instead.
     * @return {Array} An array of objects each containing an x, y
     * co-ordinate that describes the path from the starting point
     * to the end point in order.
     */
    generate(tileMap: IgeCollisionMap2d | IgeTileMap2d, startPoint: IgePathNode, endPoint: IgePathNode, comparisonCallback?: IgePathFinderComparisonCallback, allowSquare?: boolean, allowDiagonal?: boolean, allowInvalidDestination?: boolean): IgePathNode[];
    /**
     * Get all the neighbors of a node for the A* algorithm.
     * @param {IgePathNode} currentNode The current node along the path to evaluate neighbors for.
     * @param {IgePathNode} endPoint The end point of the path.
     * @param {IgeCollisionMap2d} tileMap The tile map to use when evaluating neighbours.
     * @param {IgePathFinderComparisonCallback} comparisonCallback The callback function that will decide if the tile data at the neighbouring node is to be used or not. Must return a boolean value.
     * @param {boolean} allowSquare Whether to allow neighboring tiles along a square axis.
     * @param {boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis.
     * @return {IgePathNode[]} An array containing nodes describing the neighbouring tiles of the current node.
     * @private
     */
    _getNeighbours(currentNode: IgePathNode, endPoint: IgePathNode, tileMap: IgeCollisionMap2d | IgeTileMap2d, comparisonCallback: IgePathFinderComparisonCallback, allowSquare: boolean, allowDiagonal: boolean): IgePathNode[];
    /**
     * The heuristic to calculate the rough cost of pathing from the
     * x1, y1 to x2, y2.
     * @param {number} x1 The first x co-ordinate.
     * @param {number} y1 The first y co-ordinate.
     * @param z1 The first z co-ordinate.
     * @param {number} x2 The second x co-ordinate.
     * @param {number} y2 The second y co-ordinate.
     * @param z2 The second z co-ordinate.
     * @param {number} moveCost The cost multiplier to multiply by.
     * @return {number} Returns the heuristic cost between the co-ordinates specified.
     * @private
     */
    _heuristic(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, moveCost: number): number;
}
