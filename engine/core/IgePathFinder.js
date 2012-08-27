var IgePathFinder = IgeClass.extend({
	init: function() {},

	aStar: function(start, destination, board, columns, rows) {
		// Create start and destination as true nodes
		start = new IgePathNode(start[0], start[1], -1);
		destination = new IgePathNode(destination[0], destination[1], -1);

		var nodes = {}, // Map of nodes hashed by node.hash
			open = [], // List of open nodes (nodes to be inspected)
			closed = [], // List of closed nodes (nodes we've already inspected)

			g = 0, // Cost from start to current node
			h = this.heuristic(start, destination, board, columns, rows), //Cost from current node to destination
			f = g + h, // Cost from start to destination going through the current node
			bestCost,
			bestNode,
			path,
			currentNode,
			newNodes,
			nodeIndex,
			newNode,
			isDestination,
			foundInClosed,
			foundInOpen,
			existingNode,
			i;

		// Push the start node onto the list of open nodes
		open.push(start);
		nodes[start.hash] = start;
		nodes[destination.hash] = destination;

		// Keep going while there's nodes in our open list
		while (open.length > 0)
		{
			// Find the best open node (lowest f value)

			// Alternately, you could simply keep the open list sorted by f
			// value lowest to highest, in which case you always use the first node
			bestCost = open[0].f;
			bestNode = 0;

			for (i = 1; i < open.length; i++)
			{
				if (open[i].f < bestCost)
				{
					bestCost = open[i].f;
					bestNode = i;
				}
			}

			// Set it as our current node
			currentNode = open[bestNode];

			// Check if we've reached our destination
			if (currentNode.x === destination.x && currentNode.y === destination.y)
			{
				path = [destination]; // Initialize the path with the destination node

				// Go up the chain to recreate the path
				while (currentNode.parentIndex !== -1)
				{
					currentNode = closed[currentNode.parentIndex];
					path.unshift(currentNode);
				}

				return path;
			}

			// Remove the current node from our open list
			open.splice(bestNode, 1);

			// Push it onto the closed list
			closed.push(currentNode);
			currentNode.closed = true;

			// Expand our current node (look in all 8 directions)
			newNodes = this.neighbors(currentNode, board, columns, rows);

			for (nodeIndex = 0; nodeIndex < newNodes.length; nodeIndex++) {
				newNode = newNodes[nodeIndex];
				isDestination = (destination.x === newNode.x && destination.y === newNode.y);

				// If the new node is open or the new node is our destination
				if (board[newNode.y][newNode.x] === 0 || isDestination) {
					// Do we already know about this node?
					foundInClosed = false;
					foundInOpen = false;
					existingNode = nodes[newNode.hash];

					if (existingNode) {
						if (existingNode.closed) {
							foundInClosed = true;
						}else{
							// normally we would say this: foundInOpen = true;
							// but the destination is never in either list
							foundInOpen = !isDestination;
						}
					}

					// If the node is already in our closed list, skip it.
					if (!foundInClosed) {
						// If the node is in our open list, use it.  Also use it if it is the destination (which is never in either list)
						if (!foundInOpen || isDestination) {
							//var newNode = new IgePathNode(newNode.x, newNode.y, closed.length-1);
							newNode.parentIndex = closed.length-1;

							newNode.g = currentNode.g + this.heuristic(currentNode, newNode, board, columns, rows);
							newNode.h = this.heuristic(newNode, destination, board, columns, rows);
							newNode.f = newNode.g+newNode.h;

							if (isNaN(newNode.g) || isNaN(newNode.h) || isNaN(newNode.f)) {
								console.log(newNode);
								throw("NaN heuristic?");
							}

							open.push(newNode);
							nodes[newNode.hash] = newNode;
						}
					}
				}
			}
		}

		return [];
	},

	neighbors: function(currentNode, board, columns, rows) {
		var nodes = [],
			newNode_x,
			newNode_y;

		for (newNode_x = Math.max(0, currentNode.x-1); newNode_x <= Math.min(columns-1, currentNode.x+1); newNode_x++) {
			for (newNode_y = Math.max(0, currentNode.y-1); newNode_y <= Math.min(rows-1, currentNode.y+1); newNode_y++) {
				nodes.push(new IgePathNode(newNode_x, newNode_y, -1));
			}
		}

		return nodes;
	},

	// An A* heuristic must never overestimate the distance to the goal
	// so it should either underestimate or return exactly the distance
	// to the goal.
	heuristic: function(currentNode, destination, board, columns, rows) {
		// Find the straight-line distance between the current node and the destination.
		var x = currentNode.x-destination.x,
			y = currentNode.y-destination.y;

		return x * x + y * y;  // This is faster and doesn't seem to change the results

		// return Math.sqrt(x*x + y*y);
		// return Math.sqrt(Math.pow(currentNode.x-destination.x, 2)+Math.pow(currentNode.y-destination.y, 2));
	}

});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathFinder; }