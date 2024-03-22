"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeGenericPathFinder = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass.js");
const IgePathFinderListType_1 = require("../../enums/IgePathFinderListType.js");
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
class IgeGenericPathFinder extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeGenericPathFinder";
        this._neighbourLimit = 1000;
    }
    neighbourLimit(val) {
        if (val === undefined) {
            return this._neighbourLimit;
        }
        this._neighbourLimit = val;
        return this;
    }
    /**
     * The callback function that will decide if each destination that is
     * being considered for use in the path is allowed or not.
     * @param pointTraverseTo
     * @param pointTraverseFrom
     */
    isTraversalAllowed(pointTraverseTo, pointTraverseFrom) {
        return true;
    }
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
    getConnections(currentNode, targetNode) {
        return [];
    }
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
    cost(pointA, pointB, moveCost = 1) {
        const x1 = pointA.x || 0;
        const y1 = pointA.y || 0;
        const z1 = pointA.z || 0;
        const x2 = pointB.x || 0;
        const y2 = pointB.y || 0;
        const z2 = pointB.z || 0;
        return (moveCost * (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2))) + 1;
    }
    _nodeFromData(data, link) {
        if (!data._id) {
            console.error(data);
            throw new Error("Attempting to use data in a path finding process but the data does not have an `_id`. All data points provided to the path finding system must provide an `_id`");
        }
        return {
            _id: data._id,
            data,
            link,
            listType: IgePathFinderListType_1.IgePathFinderListType.unset
        };
    }
    /**
     * Uses the A* algorithm to generate path data between two points.
     * @param {IgePoint3d} start The point on the map to start path-finding from.
     * @param {IgePoint3d} end The point on the map to try to path-find to.
     * @param {Boolean=} allowInvalidDestination If the pathfinder cannot path to the destination tile, if this is true the closest path will be returned instead.
     * @return {IgeGenericPathFinderNode[]} An array of objects each containing an x, y, z co-ordinate that describes the path from the starting point to the end point in order.
     */
    generate(start, end, allowInvalidDestination = false) {
        debugger;
        const openList = [];
        const nodeById = {};
        // Check that the end point on the map is actually allowed to be pathed to!
        if (!allowInvalidDestination && !this.isTraversalAllowed(end)) {
            // There is no path to the end point because the end point
            // is not allowed to be pathed to, and allowInvalidDestination
            // is disabled
            this.emit("noPathFound");
            //this.log("Cannot path to destination because the destination tile is not pathable!");
            return [];
        }
        const startNode = this._nodeFromData(start);
        const endNode = this._nodeFromData(end);
        startNode.cost = this.cost(start, end);
        // Starting point to open list
        openList.push(startNode);
        nodeById[startNode._id] = startNode;
        startNode.listType = IgePathFinderListType_1.IgePathFinderListType.open;
        let lowestCostNode = startNode;
        // Loop as long as there are more points to process in our open list
        while (openList.length) {
            // Check for some major error
            if (openList.length > this._neighbourLimit) {
                //this.log('Path finder error, open list nodes exceeded ' + this._neighbourLimit + '!', 'warning');
                this.emit("exceededLimit");
                break;
            }
            // Grab the lowest cost scoring node from the open list to process next
            const lowestCostIndex = this._getLowestCostNodeIndex(openList);
            const currentNode = openList[lowestCostIndex];
            // Check if the current node is the end point
            if (currentNode._id === endNode._id) {
                // We have reached the end point
                const finalPath = this._createFinalPathFromNode(currentNode);
                this.emit("pathFound", finalPath);
                return finalPath;
            }
            // Remove the current node from the open list
            openList.splice(lowestCostIndex, 1);
            // Add the current node to the closed list
            //closedList.push(currentNode);
            currentNode.listType = IgePathFinderListType_1.IgePathFinderListType.closed;
            // Get the nodes that the current node connects to
            const neighbourList = this.getConnections(currentNode.data, end);
            let neighbourCount = neighbourList.length;
            // Loop the neighbours and add each one to the open list
            while (neighbourCount--) {
                const neighbourNode = this._nodeFromData(neighbourList[neighbourCount], currentNode);
                // Check if the neighbour node has a traversal cost (null means we don't have one yet)
                // We use null for this instead of !cost because cost can be zero
                if (neighbourNode.cost === undefined || neighbourNode.cost === null) {
                    // Calculate a cost for this node
                    neighbourNode.cost = this.cost(currentNode.data, neighbourNode.data);
                }
                // Check if the neighbourNode has already been seen before
                // `haveSeenNeighbourNode` is NOT the reference equivalent of
                // `neighbourNode` - the only thing they share is an id.
                // Different routes might share the same neighbours but have
                // different traversal costs and link differently.
                let haveSeenNeighbourNode = nodeById[neighbourNode._id];
                // If we haven't seen the neighbour before or that the neighbour is not on the closed list
                if (!haveSeenNeighbourNode || haveSeenNeighbourNode.listType !== IgePathFinderListType_1.IgePathFinderListType.closed) {
                    // The neighbour is not on the closed list so
                    // check if it is already on the open list
                    if (haveSeenNeighbourNode && haveSeenNeighbourNode.listType === IgePathFinderListType_1.IgePathFinderListType.open) {
                        // The neighbour is already on the open list
                        // so check if our new path is a better score
                        if (haveSeenNeighbourNode.cost > neighbourNode.cost) {
                            // Pathing from the current node through this neighbour
                            // costs less than any way we've calculated before
                            haveSeenNeighbourNode.link = neighbourNode.link;
                            haveSeenNeighbourNode.cost = neighbourNode.cost;
                        }
                    }
                    else {
                        // Add the neighbour to the open list
                        const processedNeighbourNode = neighbourNode;
                        neighbourNode.listType = IgePathFinderListType_1.IgePathFinderListType.open;
                        openList.push(processedNeighbourNode);
                        nodeById[neighbourNode._id] = processedNeighbourNode;
                        haveSeenNeighbourNode = processedNeighbourNode;
                    }
                }
                // Check if this neighbour node has the lowest
                // cost value (distance from target) and store it
                if (!lowestCostNode || haveSeenNeighbourNode.cost < lowestCostNode.cost) {
                    lowestCostNode = haveSeenNeighbourNode;
                }
            }
        }
        if (!allowInvalidDestination || (allowInvalidDestination && !lowestCostNode)) {
            // Could not find a path, return an empty array!
            // this.log("Could not find a path to destination!");
            this.emit("noPathFound");
            return [];
        }
        const finalPath = this._createFinalPathFromNode(lowestCostNode);
        this.emit("pathFound", finalPath);
        return finalPath;
    }
    _getLowestCostNodeIndex(nodeArr) {
        let lowestCostIndex = 0;
        let openCount = nodeArr.length;
        while (openCount--) {
            if (nodeArr[openCount].cost < nodeArr[lowestCostIndex].cost) {
                lowestCostIndex = openCount;
            }
        }
        return lowestCostIndex;
    }
    _createFinalPathFromNode(startNode) {
        const finalPath = [];
        let pathPoint = startNode;
        while (pathPoint.link) {
            finalPath.push(pathPoint.data);
            pathPoint = pathPoint.link;
        }
        return finalPath.reverse();
    }
}
exports.IgeGenericPathFinder = IgeGenericPathFinder;
