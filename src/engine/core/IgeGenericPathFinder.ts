import { IgeEventingClass } from "./IgeEventingClass";
import {Ige} from "@/engine/core/Ige";

enum ListType {
	"closed",
	"open"
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
export class IgeGenericPathFinder extends IgeEventingClass {
	classId = "IgePathFinder";
	_neighbourLimit: number = 1000;

	/**
     * Gets / sets the limit on the number of neighbour nodes
     * that the pathfinder will analyse before reaching its
     * target tile. On large maps this limit should be increased
     * to allow pathing where many neighbours need to be
     * considered.
     * @param val
     * @return {*}
     */
	neighbourLimit (val?: number) {
		if (val !== undefined) {
			this._neighbourLimit = val;
			return this;
		}

		return this._neighbourLimit;
	}

	isTraversalAllowed (newX: number, newY: number, currentNode?: IgeGenericPathFinderNode | null, x?: number | null, y?: number | null, dynamic?: boolean): boolean {
		return true;
	}

	getConnections (currentNode: IgeGenericPathFinderNode, targetNode: IgeGenericPathFinderNode): IgeGenericPathFinderNode[] {
		return [];
	}

	/**
     * Uses the A* algorithm to generate path data between two points.
     * @param {IgeCollisionMap2d} tileMap The tile map to use when generating the path.
     * @param {IgePoint3d} startPoint The point on the map to start path-finding from.
     * @param {IgePoint3d} endPoint The point on the map to try to path-find to.
     * @param {Function} isTraversalAllowed The callback function that will decide if each tile that is being considered for use in the path is allowed or not based on the tile map's data stored for that tile which is passed to this method as the first parameter. Must return a boolean value.
     * @param {boolean} allowSquare Whether to allow neighboring tiles along a square axis. Defaults to true if undefined.
     * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis. Defaults to false if undefined.
     * @param {Boolean=} allowInvalidDestination If the pathfinder cannot path to the destination tile, if this is true the closest path will be returned instead.
     * @return {Array} An array of objects each containing an x, y co-ordinate that describes the path from the starting point to the end point in order.
     */
	generate (startPoint: IgeGenericPathFinderNode, endPoint: IgeGenericPathFinderNode, allowInvalidDestination: boolean = false) {
		const openList: IgeGenericPathFinderNode[] = [];
		const closedList: IgeGenericPathFinderNode[] = [];
		const nodeById: Record<string, IgeGenericPathFinderNode> = {};

		// Check that the end point on the map is actually allowed to be pathed to!
		if (!allowInvalidDestination && !this.isTraversalAllowed(endPoint.x, endPoint.y)) {
			// There is no path to the end point because the end point
			// is not allowed to be pathed to!
			this.emit("noPathFound");
			//this.log('Cannot path to destination because the destination tile is not pathable!');
			return [];
		}

		// Starting point to open list
		const startNode: IgeGenericPathFinderNode = {
			_id: startPoint._id,
			x: startPoint.x,
			y: startPoint.y,
			cost: this.cost(startPoint.x, startPoint.y, endPoint.x, endPoint.y)
		};

		openList.push(startNode);
		nodeById[startNode._id] = startNode;
		startNode.listType = ListType.open;

		let lowestCostNode = startNode;

		// Loop as long as there are more points to process in our open list
		while (openList.length) {
			// Check for some major error
			if (openList.length > this._neighbourLimit) {
				//this.log('Path finder error, open list nodes exceeded ' + this._neighbourLimit + '!', 'warning');
				this.emit("exceededLimit");
				break;
			}

			// Grab the lowest f scoring node from the open list
			// to process next
			let lowestCostIndex = 0;
			let openCount = openList.length;

			while (openCount--) {
				if (openList[openCount].cost < openList[lowestCostIndex].cost) {
					lowestCostIndex = openCount;
				}
			}

			const currentNode = openList[lowestCostIndex];

			// Check if the current node is the end point
			if (currentNode.x === endPoint.x && currentNode.y === endPoint.y) {
				// We have reached the end point
				const finalPath: IgeGenericPathFinderNode[] = [];
				let pathPoint = currentNode;

				while (pathPoint.link) {
					finalPath.push(pathPoint);
					pathPoint = pathPoint.link;
				}

				this.emit("pathFound", finalPath);

				return finalPath.reverse();
			} else {
				// Remove the current node from the open list
				openList.splice(lowestCostIndex, 1);

				// Add the current node to the closed list
				closedList.push(currentNode);
				currentNode.listType = ListType.closed;

				// Get the current node's neighbors
				const neighbourList = this.getConnections(currentNode, endPoint);
				let neighbourCount = neighbourList.length;

				// Loop the neighbours and add each one to the open list
				while (neighbourCount--) {
					const neighbourNode = neighbourList[neighbourCount];
					let existingNode = nodeById[neighbourNode._id];

					// Check that the neighbour is not on the closed list
					if (!existingNode || existingNode.listType !== ListType.closed) {
						// The neighbour is not on the closed list so
						// check if it is already on the open list
						if (existingNode && existingNode.listType === ListType.open) {
							// The neighbour is already on the open list
							// so check if our new path is a better score
							if (existingNode.cost > neighbourNode.cost) {
								// Pathing from the current node through this neighbour
								// costs less that any way we've calculated before
								existingNode.link = neighbourNode.link;
								existingNode.cost = neighbourNode.cost;
							}
						} else {
							// Add the neighbour to the open list
							openList.push(neighbourNode);
							nodeById[neighbourNode._id] = neighbourNode;
							neighbourNode.listType = 1;
							existingNode = neighbourNode;
						}
					}

					// Check if this neighbour node has the lowest
					// cost value (distance from target) and store it
					if (!lowestCostNode || existingNode.cost < lowestCostNode.cost) {
						lowestCostNode = existingNode;
					}
				}
			}

		}

		if (!allowInvalidDestination || (allowInvalidDestination && !lowestCostNode)) {
			// Could not find a path, return an empty array!
			//this.log('Could not find a path to destination!');
			this.emit("noPathFound");
			return [];
		} else {
			// We couldn't path to the destination so return
			// the closest detected end point
			let pathPoint = lowestCostNode;
			let finalPath: IgeGenericPathFinderNode[] = [];

			while (pathPoint.link) {
				finalPath.push(pathPoint);
				pathPoint = pathPoint.link;
			}

			// Reverse the final path, so it is from
			// start to finish
			finalPath = finalPath.reverse();

			this.emit("pathFound", finalPath);
			return finalPath;
		}
	}

	/**
     * The heuristic to calculate the rough cost of pathing from the
     * x1, y1 to x2, y2.
     * @param {number} x1 The first x co-ordinate.
     * @param {number} y1 The first y co-ordinate.
     * @param {number} x2 The second x co-ordinate.
     * @param {number} y2 The second y co-ordinate.
     * @param {number} moveCost The cost multiplier to multiply by.
     * @return {number} Returns the heuristic cost between the co-ordinates specified.
     * @private
     */
	cost (x1: number, y1: number, x2: number, y2: number, moveCost: number = 1) {
		return moveCost * (Math.abs(x1 - x2) + Math.abs(y1 - y2));
	}
}
