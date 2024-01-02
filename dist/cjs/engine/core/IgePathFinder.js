"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgePathFinder = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass");
const IgePathNode_1 = require("./IgePathNode");
/**
 * Creates a new path using the A* path-finding algorithm.
 */
class IgePathFinder extends IgeEventingClass_1.IgeEventingClass {
	constructor() {
		super(...arguments);
		this.classId = "IgePathFinder";
		this._neighbourLimit = 1000;
		this._squareCost = 10;
		this._diagonalCost = 10;
	}
	/**
	 * Gets / sets the cost of movement over a square (left,
	 * right, up, down) adjacent tile.
	 * @param {number=} val
	 * @return {*}
	 */
	squareCost(val) {
		if (val !== undefined) {
			this._squareCost = val;
			return this;
		}
		return this._squareCost;
	}
	/**
	 * Gets / sets the cost of movement over a diagonal (nw,
	 * ne, sw, se) adjacent tile.
	 * @param {number=} val
	 * @return {*}
	 */
	diagonalCost(val) {
		if (val !== undefined) {
			this._diagonalCost = val;
			return this;
		}
		return this._diagonalCost;
	}
	/**
	 * Gets / sets the limit on the number of neighbour nodes
	 * that the pathfinder will analyse before reaching its
	 * target tile. On large maps this limit should be increased
	 * to allow pathing where many neighbours need to be
	 * considered.
	 * @param val
	 * @return {*}
	 */
	neighbourLimit(val) {
		if (val !== undefined) {
			this._neighbourLimit = val;
			return this;
		}
		return this._neighbourLimit;
	}
	aStar() {
		this.log('The "IgePathFinder.aStar" method has been renamed to "generate". Please update your code.', "error");
	}
	/**
	 * Uses the A* algorithm to generate path data between two points.
	 * @param {IgeCollisionMap2d} tileMap The tile map to use when generating the path.
	 * @param {IgePoint3d} startPoint The point on the map to start path-finding from.
	 * @param {IgePoint3d} endPoint The point on the map to try to path-find to.
	 * @param {Function} comparisonCallback The callback function that will decide if each tile that is being considered for use in the path is allowed or not based on the tile map's data stored for that tile which is passed to this method as the first parameter. Must return a boolean value.
	 * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis. Defaults to true if undefined.
	 * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis. Defaults to false if undefined.
	 * @param {Boolean=} allowInvalidDestination If the pathfinder cannot path to the destination tile, if this is true the closest path will be returned instead.
	 * @return {Array} An array of objects each containing an x, y co-ordinate that describes the path from the starting point to the end point in order.
	 */
	generate(
		tileMap,
		startPoint,
		endPoint,
		comparisonCallback = () => true,
		allowSquare = false,
		allowDiagonal = false,
		allowInvalidDestination = false
	) {
		const openList = [];
		const closedList = [];
		const listHash = {};
		let lowestFScoringIndex,
			openCount,
			currentNode,
			pathPoint,
			finalPath,
			neighbourList,
			neighbourCount,
			neighbourNode,
			existingNode,
			lowestHNode;
		// Set some defaults
		if (allowSquare === undefined) {
			allowSquare = true;
		}
		if (allowDiagonal === undefined) {
			allowDiagonal = false;
		}
		// Check that the end point on the map is actually allowed to be pathed to!
		const tileMapData = tileMap.map._mapData;
		const endPointCheckTile =
			tileMapData[endPoint.y] && tileMapData[endPoint.y][endPoint.x] ? tileMapData[endPoint.y][endPoint.x] : null;
		if (!allowInvalidDestination && !comparisonCallback(endPointCheckTile, endPoint.x, endPoint.y)) {
			// There is no path to the end point because the end point
			// is not allowed to be pathed to!
			this.emit("noPathFound");
			//this.log('Cannot path to destination because the destination tile is not pathable!');
			return [];
		}
		// Starting point to open list
		const startNode = new IgePathNode_1.IgePathNode(
			startPoint.x,
			startPoint.y,
			0,
			0,
			this._heuristic(startPoint.x, startPoint.y, endPoint.x, endPoint.y, 10)
		);
		// TODO this makes no sense, why did we assign as one?
		//startNode.link = 1;
		openList.push(startNode);
		listHash[startNode.hash] = startNode;
		startNode.listType = 1;
		lowestHNode = startNode;
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
			lowestFScoringIndex = 0;
			openCount = openList.length;
			while (openCount--) {
				if (openList[openCount].f < openList[lowestFScoringIndex].f) {
					lowestFScoringIndex = openCount;
				}
			}
			currentNode = openList[lowestFScoringIndex];
			// Check if the current node is the end point
			if (currentNode.x === endPoint.x && currentNode.y === endPoint.y) {
				// We have reached the end point
				pathPoint = currentNode;
				finalPath = [];
				while (pathPoint.link) {
					finalPath.push(pathPoint);
					pathPoint = pathPoint.link;
				}
				this.emit("pathFound", finalPath);
				return finalPath.reverse();
			} else {
				// Remove the current node from the open list
				openList.splice(lowestFScoringIndex, 1);
				// Add the current node to the closed list
				closedList.push(currentNode);
				currentNode.listType = -1;
				// Get the current node's neighbors
				neighbourList = this._getNeighbours(
					currentNode,
					endPoint,
					tileMap,
					comparisonCallback,
					allowSquare,
					allowDiagonal
				);
				neighbourCount = neighbourList.length;
				// Loop the neighbours and add each one to the open list
				while (neighbourCount--) {
					neighbourNode = neighbourList[neighbourCount];
					existingNode = listHash[neighbourNode.hash];
					// Check that the neighbour is not on the closed list
					if (!existingNode || existingNode.listType !== -1) {
						// The neighbour is not on the closed list so
						// check if it is already on the open list
						if (existingNode && existingNode.listType === 1) {
							// The neighbour is already on the open list
							// so check if our new path is a better score
							if (existingNode.g > neighbourNode.g) {
								// Pathing from the current node through this neighbour
								// costs less that any way we've calculated before
								existingNode.link = neighbourNode.link;
								existingNode.g = neighbourNode.g;
								existingNode.f = neighbourNode.f;
							}
						} else {
							// Add the neighbour to the open list
							openList.push(neighbourNode);
							listHash[neighbourNode.hash] = neighbourNode;
							neighbourNode.listType = 1;
							existingNode = neighbourNode;
						}
					}
					// Check if this neighbour node has the lowest
					// h value (distance from target) and store it
					if (!lowestHNode || existingNode.h < lowestHNode.h) {
						lowestHNode = existingNode;
					}
				}
			}
		}
		if (!allowInvalidDestination || (allowInvalidDestination && !lowestHNode)) {
			// Could not find a path, return an empty array!
			//this.log('Could not find a path to destination!');
			this.emit("noPathFound");
			return [];
		} else {
			// We couldn't path to the destination so return
			// the closest detected end point
			pathPoint = lowestHNode;
			finalPath = [];
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
	 * Get all the neighbors of a node for the A* algorithm.
	 * @param {IgePathNode} currentNode The current node along the path to evaluate neighbors for.
	 * @param {IgePathNode} endPoint The end point of the path.
	 * @param {IgeCollisionMap2d} tileMap The tile map to use when evaluating neighbours.
	 * @param {Function} comparisonCallback The callback function that will decide if the tile data at the neighbouring node is to be used or not. Must return a boolean value.
	 * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis.
	 * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis.
	 * @return {Array} An array containing nodes describing the neighbouring tiles of the current node.
	 * @private
	 */
	_getNeighbours(currentNode, endPoint, tileMap, comparisonCallback, allowSquare, allowDiagonal) {
		const list = [];
		const { x, y } = currentNode;
		let newX = 0;
		let newY = 0;
		const mapData = tileMap.map._mapData;
		const currentNodeData = mapData[y] && mapData[y][x] ? mapData[y][x] : undefined;
		let tileData;
		if (allowSquare) {
			newX = x - 1;
			newY = y;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._squareCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost),
					currentNode,
					"W"
				);
				list.push(newNode);
			}
			newX = x + 1;
			newY = y;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._squareCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost),
					currentNode,
					"E"
				);
				list.push(newNode);
			}
			newX = x;
			newY = y - 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._squareCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost),
					currentNode,
					"N"
				);
				list.push(newNode);
			}
			newX = x;
			newY = y + 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._squareCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost),
					currentNode,
					"S"
				);
				list.push(newNode);
			}
		}
		if (allowDiagonal) {
			newX = x - 1;
			newY = y - 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._diagonalCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost),
					currentNode,
					"NW"
				);
				list.push(newNode);
			}
			newX = x + 1;
			newY = y - 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._diagonalCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost),
					currentNode,
					"NE"
				);
				list.push(newNode);
			}
			newX = x - 1;
			newY = y + 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._diagonalCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost),
					currentNode,
					"SW"
				);
				list.push(newNode);
			}
			newX = x + 1;
			newY = y + 1;
			tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
			if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
				const newNode = new IgePathNode_1.IgePathNode(
					newX,
					newY,
					currentNode.g,
					this._diagonalCost,
					this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost),
					currentNode,
					"SE"
				);
				list.push(newNode);
			}
		}
		return list;
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
	_heuristic(x1, y1, x2, y2, moveCost) {
		return moveCost * (Math.abs(x1 - x2) + Math.abs(y1 - y2));
	}
}
exports.IgePathFinder = IgePathFinder;
