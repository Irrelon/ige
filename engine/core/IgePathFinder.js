var IgePathFinder = IgeClass.extend({
	init: function() {},

	/**
	 * Uses the A* algorithm to generate path data between two points.
	 * @param {IgeCollisionMap2d} tileMap The tile map to use when generating the path.
	 * @param {IgePoint} startPoint The point on the map to start path-finding from.
	 * @param {IgePoint} endPoint The point on the map to try to path-find to.
	 * @param {Function} comparisonCallback The callback function that will decide if each tile that is being considered for use in the path is allowed or not based on the tile map's data stored for that tile which is passed to this method as the first parameter. Must return a boolean value.
	 * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis. Defaults to true if undefined.
	 * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis. Defaults to false if undefined.
	 * @return {Array} An array of objects each containing an x, y co-ordinate that describes the path from the starting point to the end point in order.
	 */
	aStar: function (tileMap, startPoint, endPoint, comparisonCallback, allowSquare, allowDiagonal) {
		var openList = [],
			closedList = [],
			startNode,
			lowInd,
			openCount,
			currentNode,
			pathPoint,
			finalPath,
			neighbourList,
			neighborCount,
			neighbourNode,
			gScore,
			bestScore;

		// Set some defaults
		if (allowSquare === undefined) { allowSquare = true; }
		if (allowDiagonal === undefined) { allowDiagonal = false; }

		// Starting point to open list
		startNode = new IgePathNode(startPoint.x, startPoint.y, 0);
		startPoint.link = 1;
		openList.push(startPoint);

		// Loop as long as there are more points to process in our open list
		while (openList.length) {

			// Check for some major error
			if (openList.length > 1000) {
				this.log('Path finder error, open list nodes exceeded 1000!', 'error');
				break;
			}

			// Grab the lowest f(x) to process next
			lowInd = 0;
			openCount = openList.length;

			while (openCount--) {
				if(openList[openCount].h < openList[lowInd].h) { lowInd = openCount; }
			}

			currentNode = openList[lowInd];

			// Check if the current node is the end point
			if (currentNode.x === endPoint.x && currentNode.y === endPoint.y) {
				// We have reached the end point
				pathPoint = currentNode;
				finalPath = [];

				while(pathPoint.link) {
					finalPath.push(pathPoint);
					pathPoint = pathPoint.link;
				}

				return finalPath.reverse();
			} else {
				// Remove the current node from the open list
				openList.splice(lowInd, 1);

				// Add the current node to the closed list
				closedList.push(currentNode);

				// Get the current node's neighbors
				neighbourList = this._getNeighbours(currentNode, endPoint, tileMap, comparisonCallback, allowSquare, allowDiagonal);
				neighborCount = neighbourList.length;

				// Loop the neighbors
				while (neighborCount--) {
					neighbourNode = neighbourList[neighborCount];
					if (closedList.indexOf(neighbourNode) === -1) {
						// Neighbor node is not on closed list
						gScore = currentNode.score;
						bestScore = false;

						if (openList.indexOf(neighbourNode) === -1) {
							// The neighbour node is not in the open list yet
							bestScore = true;
							neighbourNode.g = this._heuristic(neighbourNode.x, neighbourNode.y, endPoint.x, endPoint.y);
							openList.push(neighbourNode);
						} else if (gScore < neighbourNode.score) {
							// The neighbour node is in the open list already
							bestScore = true;
						}

						if (bestScore) {
							neighbourNode.link = currentNode;
							neighbourNode.h = neighbourNode.score + neighbourNode.g;
						}
					}
				}
			}

		}

		// Could not find a path, return an empty array!
		return [];

	},

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
	_getNeighbours: function (currentNode, endPoint, tileMap, comparisonCallback, allowSquare, allowDiagonal) {
		var list = [],
			x = currentNode.x,
			y = currentNode.y,
			newX = 0,
			newY = 0,
			newNode,
			mapData = tileMap.map._mapData,
			tileData;

		if (allowSquare) {
			newX = x - 1; newY = y;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1);
				list.push(newNode);
			}

			newX = x + 1; newY = y;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1);
				list.push(newNode);
			}

			newX = x; newY = y - 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1);
				list.push(newNode);
			}

			newX = x; newY = y + 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1);
				list.push(newNode);
			}

		}

		if (allowDiagonal) {
			newX = x - 1; newY = y - 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1.4);
				list.push(newNode);
			}

			newX = x + 1; newY = y - 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1.4);
				list.push(newNode);
			}

			newX = x - 1; newY = y + 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1.4);
				list.push(newNode);
			}

			newX = x + 1; newY = y + 1;
			tileData = mapData[newX] && mapData[newX][newY] ? mapData[newX][newY] : null;
			if (comparisonCallback(tileData)) {
				newNode = new IgePathNode(newX, newY, 1.4);
				list.push(newNode);
			}
		}

		return list;
	},

	/**
	 * The heuristic to add to a movement cost for the A* algorithm.
	 * @param {Number} x1 The first x co-ordinate.
	 * @param {Number} y1 The first y co-ordinate.
	 * @param {Number} x2 The second x co-ordinate.
	 * @param {Number} y2 The second y co-ordinate.
	 * @return {Number} Returns the heuristic cost between the co-ordinates specified.
	 * @private
	 */
	_heuristic: function (x1, y1, x2, y2) {
		return Math.abs(x1 - x2) + Math.abs(y1 - y2);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathFinder; }