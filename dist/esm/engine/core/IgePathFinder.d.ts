import type { IgeCollisionMap2d } from "./IgeCollisionMap2d.js"
import { IgeGenericPathFinder } from "./IgeGenericPathFinder.js"
import { IgePathNode } from "./IgePathNode.js"
import type { IgeTileMap2d } from "./IgeTileMap2d.js"
/**
 * Creates a new tile-based pathfinder using the A*
 * path-finding algorithm. Extends the IgeGenericPathFinder
 * class and implements the `isTraversalAllowed()` and
 * `getConnections()` methods that the generic pathfinder
 * uses to generate a path.
 */
export declare class IgePathFinder extends IgeGenericPathFinder {
    classId: string;
    _squareCost: number;
    _diagonalCost: number;
    _tileMap: IgeCollisionMap2d | IgeTileMap2d;
    _allowSquare: boolean;
    _allowDiagonal: boolean;
    constructor(tileMap: IgeCollisionMap2d | IgeTileMap2d, allowSquare?: boolean, allowDiagonal?: boolean);
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
     * Get all the neighbors of a node for the A* algorithm.
     * @param {IgePathNode} currentNode The current node along the path to evaluate neighbors for.
     * @param {IgePathNode} endPoint The end point of the path.
     * @return {IgePathNode[]} An array containing nodes describing the neighbouring tiles of the current node.
     * @private
     */
    getConnections(currentNode: IgePathNode, endPoint: IgePathNode): IgePathNode[];
}
