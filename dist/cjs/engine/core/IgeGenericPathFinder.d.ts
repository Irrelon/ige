import { IgeEventingClass } from "./IgeEventingClass.js"
import type { IgeCanId } from "../../types/IgeCanId.js"
import type { IgeGenericPathFinderNode } from "../../types/IgeGenericPathFinderNode.js"
import type { IgePathFinderFunctionality } from "../../types/IgePathFinderFunctionality.js"
/**
 * This is a generic base class that must be extended to function properly.
 * It provides the basic structure for a path-finding system utilising A*
 * but can be applied to many different path layouts / map layouts. Rather
 * than assuming that a path is generated over square tiles, this generic
 * class provides an interface to solve pathing problems along abstract maps
 * such as roads, star-gates, hex-tiles etc. It does this by allowing you to
 * define the core functions `cost()`, `getConnections()` and `isTraversalAllowed()`.
 * From those three functions any map, grid, structure or complex graph can
 * be traversed and a path generated. See the IgePathFinder() class which
 * extends this one to get a feel for how to use this generic base class in
 * your application.
 */
export declare class IgeGenericPathFinder<DataType extends IgeCanId = any> extends IgeEventingClass implements IgePathFinderFunctionality<DataType> {
    classId: string;
    _neighbourLimit: number;
    /**
     * Gets / sets the limit on the number of neighbour nodes
     * that the pathfinder will analyse before reaching its
     * target tile. On large maps this limit should be increased
     * to allow pathing where many neighbours need to be
     * considered. Defaults to 1000.
     */
    neighbourLimit(): number;
    neighbourLimit(val: number): this;
    /**
     * The callback function that will decide if each destination that is
     * being considered for use in the path is allowed or not.
     * @param pointTraverseTo
     * @param pointTraverseFrom
     */
    isTraversalAllowed(pointTraverseTo: DataType, pointTraverseFrom?: DataType): boolean;
    /**
     * Must be overridden in order for any path-finding to operate. Gets an
     * array of points that the passed `currentNode` is connected to. When
     * finding a path, this function is used to figure our which point the path
     * should move to next. Once you return an array of points to inspect, the
     * path-finding algorithm will attribute a cost of movement to each point
     * using the `cost()` method. The least costly point is then selected and
     * becomes the next point to pass as the `currentNode` to this function.
     *
     * By default, the stock `cost()` function will determine cost by adding
     * up the distance of each point co-ordinate (x, y, z) from the current
     * node to the target node. You can override the `cost()` function to use
     * different cost calculations, adding or removing dimensions (even adding
     * time to a dimension if you like!).
     *
     * @param currentNode The node to return all neighbours / connections of.
     * You do not need to filter this list of connecting points, but you can
     * if you want to. Points that have already had traversal attempted or
     * points for which the `isTraversalAllowed()` function returns false will
     * not be used in any future path-finding calculations.
     *
     * @param targetNode The node we are trying to get to at the end of the path.
     * It is passed to getConnections() in case your application logic requires
     * it in order to properly determine what connections should be returned.
     */
    getConnections(currentNode: DataType, targetNode: DataType): DataType[];
    /**
     * The heuristic to calculate the rough cost of pathing from pointA to pointB.
     * In this default form, the pointA and pointB objects are assumed to have
     * x, y, z properties of type number. If they don't, the values default to
     * zero. You can override this function in your own class that extends this
     * one to provide cost based on other properties or metrics as you see fit.
     *
     * We add one at the end of all cost calculations to make the traversal
     * across each connection cost at least one. This means that even if no
     * other cost data is present, the shortest path in total moves to the
     * target will be chosen by the algorithm.
     *
     * @param {number} pointA The first point.
     * @param {number} pointB The second point.
     * @param {number} moveCost The cost multiplier to multiply by.
     * @return {number} Returns the heuristic cost between the points specified.
     * @private
     */
    cost(pointA: any, pointB: any, moveCost?: number): number;
    _nodeFromData(data: DataType, link?: IgeGenericPathFinderNode<DataType>): IgeGenericPathFinderNode<DataType>;
    /**
     * Uses the A* algorithm to generate path data between two points.
     * @param {IgePoint3d} start The point on the map to start path-finding from.
     * @param {IgePoint3d} end The point on the map to try to path-find to.
     * @param {Boolean=} allowInvalidDestination If the pathfinder cannot path to the destination tile, if this is true the closest path will be returned instead.
     * @return {IgeGenericPathFinderNode[]} An array of objects each containing an x, y, z co-ordinate that describes the path from the starting point to the end point in order.
     */
    generate(start: DataType, end: DataType, allowInvalidDestination?: boolean): DataType[];
    _getLowestCostNodeIndex(nodeArr: IgeGenericPathFinderNode<DataType>[]): number;
    _createFinalPathFromNode(startNode: IgeGenericPathFinderNode<DataType>): DataType[];
}
