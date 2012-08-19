var IgePath = IgeEventingClass.extend({
	classId: 'IgePath',

	init: function () {
		this.tileMap = this.entities.tileMapCache;
		this.processList = [];
	},

	/** create - Create a new path object INSIDE the passed object's $local object. This is different
	from the other create methods in the engine because it does not take a definition as a parameter and
	does not store the created object in any lookup arrays inside this class. A path object is
	stored entirely in the object that wants a path rather than being referenced through a lookup
	array. {
		category:"method",
		return: {
			type:"bool",
			desc:"Returns true on success and false on failure.",
		},
		arguments: [{
			type:"object",
			name:"obj",
			desc:"The item that you want to create a new path for.",
		}],
	} **/
	create: function (obj) {
		// Check for a local object
		if (obj.$local) {
			// Check for a map object
			if (obj.$local.$map) {
				var path = {};
				path.points = [];
				
				obj.path = path;
				
				/* CEXCLUDE */
				if (this._sendNetData) {
					if (this.ige.isServer) {
						// TO-DO - This should not be hard-coded to use entity_id because in the future,
						// cameras will have paths too.
						switch (obj.entity_locale) {
							case LOCALE_EVERYWHERE:
							case LOCALE_EVERYWHERE + LOCALE_DB:
								this.ige.network.send('pathsCreate', [obj.entity_id]);
							break;
							
							case LOCALE_ALL_CLIENTS:
							case LOCALE_ALL_CLIENTS + LOCALE_DB:
								this.ige.network.send('pathsCreate', [obj.entity_id]);
							break;
							
							case LOCALE_SINGLE_CLIENT:
							case LOCALE_SINGLE_CLIENT + LOCALE_DB:
								this.ige.network.send('pathsCreate', [obj.entity_id], obj.session_id);
							break;
							
							case LOCALE_SERVER_ONLY:
							case LOCALE_SERVER_ONLY + LOCALE_DB:
								// Do nothing, it's server only
							break;
						}
						
					}
				}
				/* CEXCLUDE */
				
				return true;
			} else {
				// No map object in local object!
				return false;
			}
		} else {
			// No local object in passed object!
			return false;
		}
	},
	
	/** addPathPoint - Adds a new point to a path. {
		category:"method",
		arguments: [{
			type:"object",
			name:"obj",
			desc:"The item that you want to add a new path point for.",
		}, {
			type:"integer",
			name:"x",
			desc:"The x co-ordinate of the new path point.",
		}, {
			type:"integer",
			name:"y",
			desc:"The y co-ordinate of the new path point.",
		}, {
			type:"integer",
			name:"speed",
			desc:"The speed at which an entity should move from the previous point to the new point being added in pixels per second.",
		}, {
			type:"bool",
			name:"inActualCords",
			desc:"If true, will take the x and y provided to be actual map co-ordinates rather than tile co-ordinates. If false, converts the x and y from tile co-ordinates into actual co-ordinates.",
		}, {
			type:"string",
			name:"targetEntityId",
			desc:"*Experimental - not currently production ready* The id of an entity who's co-ordinates will be used as the new point's destination. This means that if the target entity changes position, this path point will also update meaning a path can dynamically update to target an entity as a path point.",
			flags:"optional",
		}],
	} **/
	addPathPoint: function (obj, x, y, speed, inActualCords, targetEntityId) {
		if (obj.$local) {
			
			if (obj.path) {
				
				var path = obj.path;
				path.points = path.points || [];
				
				var pathPoints = path.points;
				
				// If not using pixel co-ordinates, convert from tiles to pixels using map tile sizes
				if (!inActualCords) {
					oldX = x;
					oldY = y;
					x = x * obj.$local.$map.map_tilesize;
					y = y * obj.$local.$map.map_tilesize;
				} else {
					oldX = null;
					oldY = null;
				}
				
				if (pathPoints.length > 0) {
					
					// Calculate distance from previous point
					var previousPoint = pathPoints[pathPoints.length - 1];
					
					var deltaY = (y - previousPoint.y);
					var deltaX = (x - previousPoint.x);
					
					var distanceBetweenP1AndP2 = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
				}
				
				// Define the new point
				var point = {
					x: x,
					y: y,
					speed: speed,
					dist: distanceBetweenP1AndP2,
					tile: [oldX, oldY],
					entity_id: targetEntityId,
				}
				
				// Add the new point
				pathPoints.push(point);
				
				/* CEXCLUDE */
				if (this._sendNetData) {
					if (this.ige.isServer) {
						// TO-DO - This should not be hard-coded to use entity_id because in the future,
						// cameras will have paths too.
						switch (obj.entity_locale) {
							case LOCALE_EVERYWHERE:
							case LOCALE_EVERYWHERE + LOCALE_DB:
								this.ige.network.send('pathsAddPoint', [obj.entity_id, point]); //, null, 'pathsAddPoint'
							break;
							
							case LOCALE_ALL_CLIENTS:
							case LOCALE_ALL_CLIENTS + LOCALE_DB:
								this.ige.network.send('pathsAddPoint', [obj.entity_id, point]);
							break;
							
							case LOCALE_SINGLE_CLIENT:
							case LOCALE_SINGLE_CLIENT + LOCALE_DB:
								this.ige.network.send('pathsAddPoint', [obj.entity_id, point], obj.session_id);
							break;
							
							case LOCALE_SERVER_ONLY:
							case LOCALE_SERVER_ONLY + LOCALE_DB:
								// Do nothing, it's server only
							break;
						}
						
					}
				}
				/* CEXCLUDE */				
				
			} else {
				// No path object in passed object
				this.log('No path object in passed object.', 'error', obj);
			}
			
		} else {
			// No local object in passed object
			this.log('No local object in passed object.', 'error', obj);
		}
	},
	
	/** positionAt - Calculate the position along a path based upon a time. {
		category:"method",
		return: {
			type:"object",
			desc:"Returns an object with an x and y property denoting the current position along the path at the given time.",
		},
		arguments: [{
			type:"object",
			name:"path",
			desc:"The path object to calculate a position from.",
		}, {
			type:"integer",
			name:"startTime",
			desc:"The time that movement first started along the path in milliseconds.",
		}, {
			type:"integer",
			name:"currentTime",
			desc:"The current time in milliseconds used to determine the distance of movement along the path.",
		}],
	} **/
	positionAt: function (path, startTime, currentTime) {
		var pathPoints = path.points;
		
		// Calculate the delta time in seconds
		var delta = (currentTime - startTime) / 1000;
		var sectionDeltaTime = 0;
		
		var previousPoint = null;
		var currentPoint = null;
		
		var timeTaken = 0;
		var totalTime = 0;
		
		var currentPosition = {x:0, y:0};
		
		for (var i = 1; i < pathPoints.length; i++) {
			
			if (i > 0) {
				
				currentPoint = pathPoints[i];
				previousPoint = pathPoints[i - 1];
				
				timeTaken = currentPoint.dist / previousPoint.speed;
				
				if ((totalTime + timeTaken) > delta) {
					
					currentPosition.x = previousPoint.x;
					currentPosition.y = previousPoint.y;
					
					sectionDeltaTime = delta - totalTime;
					
					return this.positionAlongVector(previousPoint, currentPoint, previousPoint.speed, sectionDeltaTime);
					
				} else {
					
					totalTime += timeTaken;
					
				}
				
			}
			
		}
		
		return currentPoint;
		
	},
	
	/** positionAlongVector - Calculates the position between two points using
	a fixed speed and time (internal use). {
		category:"method",
		return: {
			type:"object",
			desc:"Returns an object with an x and y property denoting the current position along the vector between two points at the given time and speed.",
		},
		arguments: [{
			type:"object",
			name:"p1",
			desc:"The first point along the vector.",
		}, {
			type:"object",
			name:"p2",
			desc:"The second point along the vector.",
		}, {
			type:"integer",
			name:"speed",
			desc:"The speed at which movement is being processed along the vector.",
		}, {
			type:"integer",
			name:"time",
			desc:"The overall travel time in milliseconds between the first point and the second.",
		}],
	} **/
	positionAlongVector: function (p1, p2, speed, time)
	{
		
		var newPoint = {};
		
		var deltaY = (p2.y - p1.y);
		var deltaX = (p2.x - p1.x);
		
		var distanceBetweenP1AndP2 = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
		
		var xVelocity = speed * deltaX / distanceBetweenP1AndP2;
		var yVelocity = speed * deltaY / distanceBetweenP1AndP2;
		
		newPoint.x = p1.x + (xVelocity * time);
		newPoint.y = p1.y + (yVelocity * time);
		
		return newPoint;
		
	},
	
	/** localGeneratePath - Generates a path on the local engine between two points. This method requires
	that the two points are currently in memory. Attempting to generate a path without all the map
	tile data will result in an error. {
		category:"method",
		engine_ver:"1.0.0",
		return: {
			type:"object",
			desc:"An object describing the generated path between the start and end points, or false on failure.",
		},
		arguments: [{
			type:"object",
			name:"map",
			desc:"The map to use when reading tile map data from.",
		}, {
			type:"object",
			name:"options",
			desc:"An object containing the options to use when building the path.",
			link:"pathOptions",
		}],
	} **/
	localGeneratePath: function (map, options) {
		// Extract the option variables
		if (typeof(options) != 'object') {
			var entityType = arguments[1],
				startPoint = arguments[2],
				endPoint = arguments[3],
				pathClasses = arguments[4],
				allowSquare = arguments[5],
				allowDiagonal = arguments[6];
				this.log('Calling localGeneratePath with more than two arguments is depreciated and will not work in future versions of the engine. Please switch to the new way of calling this method which takes two arguments, 1 = map, 2 = options object. The options object can contain these supported parameters: entityType, startPoint, endPoint, pathClasses, avoidClasses, allowSquare, allowDiagonal. This change is to allow easy addition of new parameters in future versions of this method. Please see the "pathOptions" page in the API Documentation for more information.', 'warning', null, true);
		} else {
			// Use the new options object
			var entityType = options.entityType,
				startPoint = options.startPoint,
				endPoint = options.endPoint,
				pathClasses = options.pathClasses,
				avoidClasses = options.avoidClasses,
				allowSquare = options.allowSquare,
				allowDiagonal = options.allowDiagonal;
		}
		
		// Check that the start and end points have tiles that are assigned the required class name
		var mapId = map.map_id;
		var finalTileMap = this.tileMap[mapId][entityType];
		
		// Check start point
		if (this.tileExistsWithClass(startPoint[0], startPoint[1], finalTileMap, pathClasses)) {
			// Check end point
			if (this.tileExistsWithClass(startPoint[0], startPoint[1], finalTileMap, pathClasses)) {
				// Start and end-points are ok
				// Use A* to calculate the path from start point to end point
				return this.aStar(finalTileMap, startPoint, endPoint, pathClasses, allowSquare, allowDiagonal);
			} else {
				this.log('Cannot generate path with desired end-point because none of the entities at the end-point match the class name / array provided.', 'warning', pathClasses);
			}
		} else {
			this.log('Cannot generate path with desired start-point because none of the entities at the start-point match the class name / array provided.', 'warning', pathClasses);
		}
	},
	
	/** aStar - Uses the A* algorithm to generate path data between two points. {
		category:"method",
		engine_ver:"1.0.0",
		return: {
			type:"array",
			desc:"An array of points along the generated path between the start and end points (including the start and end points), or a blank array on failure.",
		},
		arguments: [{
			type:"array",
			name:"tileMap",
			desc:"The tile map data to use when generating the path.",
		}, {
			type:"array",
			name:"startPoint",
			desc:"An array describing the starting point of the path to generate in tile co-ordinates. [0] = x, [1] = y.",
		}, {
			type:"array",
			name:"endPoint",
			desc:"An array describing the ending point of the path to generate in tile co-ordinates. [0] = x, [1] = y.",
		}, {
			type:"multi",
			name:"className",
			desc:"The class or an array of classes of which one must exist on a tile in order for the path to be allowed to pass through it.",
		}, {
			type:"bool",
			name:"allowSquare",
			desc:"If set to true, will allow the path to make movements in the North, South, East and West directions.",
		}, {
			type:"bool",
			name:"allowDiagonal",
			desc:"If set to true, will allow the path to make movements in the North-West, North-East, South-West and South-East directions.",
		}],
	} **/
	aStar: function (tileMap, startPoint, endPoint, className, allowSquare, allowDiagonal) {
		
		var openList = [];
		var closedList = [];
		
		// Starting point to open list
		var startNode = this.createNode(startPoint[0], startPoint[1], 0);
		startPoint[5] = 1;
		openList.push(startPoint);
		
		// Loop as long as there are more points to process in our open list
		while (openList.length) {
			
			// Grab the lowest f(x) to process next
			var lowInd = 0;
			var openCount = openList.length;
			
			while (openCount--) {
				if(openList[openCount][4] < openList[lowInd][4]) { lowInd = openCount; }
			}
			
			var currentNode = openList[lowInd];
			
			// Check if the current node is the end point
			if (currentNode[0] == endPoint[0] && currentNode[1] == endPoint[1]) {
				// We have reached the end point
				var pathPoint = currentNode;
				var finalPath = [];
				
				while(pathPoint[5]) {
					finalPath.push(pathPoint);
					pathPoint = pathPoint[5];
				}
				
				return finalPath.reverse();
			} else {
				// Remove the current node from the open list
				openList.splice(lowInd, 1);
				
				// Add the current node to the closed list
				closedList.push(currentNode);
				
				// Get the current node's neighbors
				var nList = this.getNeighbors(currentNode, endPoint, tileMap, className, allowSquare, allowDiagonal);
				var neighborCount = nList.length;
				
				// Loop the neighbors
				while (neighborCount--) {
					var neighbor = nList[neighborCount];
					if (this.inList(closedList, neighbor[0], neighbor[1])) {
						// Neighbor is already in closed list so skip to next neighbor
						continue;
					} else {
						// Neighbor is not on closed list
						var gScore = currentNode[2];
						var bestScore = false;
						
						if (!this.inList(openList, neighbor[0], neighbor[1])) {
							bestScore = true;
							neighbor[3] = this.heuristic(neighbor[0], neighbor[1], endPoint[0], endPoint[1]);
							openList.push(neighbor);
						} else if (gScore < neighbor[2]) {
							bestScore = true;
						}
						
						if (bestScore) {
							neighbor[5] = currentNode;
							neighbor[4] = neighbor[2] + neighbor[3];	
						}
					}
				}
			}
			
		}
		
		// Could not find a path, return an empty array!
		return [];
		
	},
	
	/** createNode - Create a new node for the A* algorithm. {
		category:"method",
		return: {
			type:"array",
			desc:"An array containing data about the new path node.",
		},
		arguments: [{
			type:"array",
			name:"x",
			desc:"The x co-ordinate of the node point.",
		}, {
			type:"array",
			name:"y",
			desc:"The y co-ordinate of the node point.",
		}, {
			type:"array",
			name:"score",
			desc:"The node score.",
		}],
	} **/
	createNode: function (x, y, score) {
		var node = [];
		
		node[0] = x;
		node[1] = y;
		node[2] = score; // g
		node[3] = 0; // h
		node[4] = 0; // f
		node[5] = null;
		
		return node;
	},
	
	/** getNeighbors - Get all the neighbors of a tile for the A* algorithm. {
		category:"method",
		engine_ver:"1.0.0",
		return: {
			type:"array",
			desc:"An array containing nodes describing the neighboring tiles of the current node.",
		},
		arguments: [{
			type:"array",
			name:"currentNode",
			desc:"The current node along the path to evaluate neighbors for.",
		}, {
			type:"array",
			name:"endPoint",
			desc:"The end point of the path.",
		}, {
			type:"array",
			name:"tileMap",
			desc:"The tile map data to use when evaluating neighbors.",
		}, {
			type:"mutli",
			name:"className",
			desc:"The class name or array of class names one of which each neighbor must have to be added to the neighbor list.",
		}, {
			type:"bool",
			name:"allowSquare",
			desc:"Whether to allow neighboring tiles along a square axis.",
		}, {
			type:"bool",
			name:"allowDiagonal",
			desc:"Whether to allow neighboring tiles along a diagonal axis.",
		}],
	} **/
	getNeighbors: function (currentNode, endPoint, tileMap, className, allowSquare, allowDiagonal) {
		var list = [];
		var x = currentNode[0];
		var y = currentNode[1];
		var newX = 0;
		var newY = 0;
		
		if (allowSquare) {
			
			newX = x - 1; newY = y;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1);
				list.push(newNode);
			}
			
			newX = x + 1; newY = y;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1);
				list.push(newNode);
			}
			
			newX = x; newY = y - 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1);
				list.push(newNode);
			}
			
			newX = x; newY = y + 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1);
				list.push(newNode);
			}
			
		}
		
		if (allowDiagonal) {
			
			newX = x - 1; newY = y - 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1.4);
				list.push(newNode);
			}
			
			newX = x + 1; newY = y - 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1.4);
				list.push(newNode);
			}
			
			newX = x - 1; newY = y + 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1.4);
				list.push(newNode);
			}
			
			newX = x + 1; newY = y + 1;
			if (this.tileExistsWithClass(newX, newY, tileMap, className)) {
				var newNode = this.createNode(newX, newY, 1.4);
				list.push(newNode);
			}
		}
		
		return list;
	},
	
	/** inList - Check if the passed x and y are in the passed list of nodes for the A* algorithm. {
		category:"method",
		return: {
			type:"bool",
			desc:"Returns true if the passed x and y relate to a node in the passed list, false otherwise.",
		},
		arguments: [{
			type:"array",
			name:"list",
			desc:"A list of nodes.",
		}, {
			type:"integer",
			name:"x",
			desc:"The x co-ordinate to check nodes for.",
		}, {
			type:"integer",
			name:"y",
			desc:"The y co-ordinate to check nodes for.",
		}],
	} **/
	inList: function (list, x, y) {
		var listCount = list.length;
		while (listCount--) {
			if (list[listCount][0] == x && list[listCount][1] == y) {
				return true;
			}
		}
		
		return false;
	},
	
	/** cost - Calculate the cost of moving between two nodes for the A* algorithm. {
		category:"method",
		return: {
			type:"integer",
			desc:"Returns the cost of movement between the parent node and the current node.",
		},
		arguments: [{
			type:"array",
			name:"parentNode",
			desc:"The parent node to evaluate cost from.",
		}, {
			type:"array",
			name:"currentNode",
			desc:"The node to evaluate cost to.",
		}],
	} **/
	cost: function (parentNode, currentNode) {
		return parentNode[2] + currentNode[2];
	},
	
	/** heuristic - The heuristic to add to a movement cost for the A* algorithm. {
		category:"method",
		return: {
			type:"integer",
			desc:"Returns the heuristic cost between the co-ordinates specified.",
		},
		arguments: [{
			type:"integer",
			name:"x1",
			desc:"The first x co-ordinate.",
		}, {
			type:"integer",
			name:"y1",
			desc:"The first y co-ordinate.",
		}, {
			type:"integer",
			name:"x2",
			desc:"The second x co-ordinate.",
		}, {
			type:"integer",
			name:"y2",
			desc:"The second y co-ordinate.",
		}],
	} **/	
	heuristic: function (x1, y1, x2, y2) {
		return Math.abs(x1 - x2) + Math.abs(y1 - y2);
	},
	
	/** tileExists - Checks if a tile exists on the tile map for the A* algorithm. {
		category:"method",
		return: {
			type:"bool",
			desc:"Returns true if the tile exists in the passed tile map data, or false otherwise.",
		},
		arguments: [{
			type:"integer",
			name:"x",
			desc:"The x co-ordinate of the tile to check existence of.",
		}, {
			type:"integer",
			name:"y",
			desc:"The y co-ordinate of the tile to check existence of.",
		}, {
			type:"array",
			name:"tileMap",
			desc:"The tile map to evaluate tile data from.",
		}],
	} **/
	tileExists: function (x, y, tileMap) {
		if (tileMap[x] && tileMap[x][y]) {
			return true;
		} else {
			return false;
		}
	},
	
	/** tileExistsWithClass - Checks if a tile exists with a particular class on the tile map for the A* algorithm. {
		category:"method",
		engine_ver:"1.0.0",
		return: {
			type:"bool",
			desc:"Returns true if the tile exists with the specified class in the passed tile map data, or false otherwise.",
		},
		arguments: [{
			type:"integer",
			name:"x",
			desc:"The x co-ordinate of the tile to check existence of.",
		}, {
			type:"integer",
			name:"y",
			desc:"The y co-ordinate of the tile to check existence of.",
		}, {
			type:"array",
			name:"tileMap",
			desc:"The tile map to evaluate tile data from.",
		}, {
			type:"multi",
			name:"className",
			desc:"The string name or an array of string names of classes to check tile data for.",
		}],
	} **/
	tileExistsWithClass: function (x, y, tileMap, className) {
		if (!className) {
			// Commented because if no className is passed then ALL tiles should be ok
			// event if no actual tile entity exists at the tile map position
			//return this.tileExists(x, y, tileMap);
			return true;
		} else {
			if (tileMap[x] && tileMap[x][y] && tileMap[x][y].path_class != null) {
				var tmPathClassArray = tileMap[x][y].path_class;
				
				if (typeof(className) == 'string') {
					if (tmPathClassArray.indexOf(className) != -1) {
						return true;
					} else {
						return false;
					}
				} else if (typeof(className) == 'object') {
					// This is an array of classes so loop each and check
					var count = className.length;
					var cn = '';
					
					while (count--) {
						cn = className[count];
						
						if (cn) {
							if (tmPathClassArray.indexOf(cn) != -1) {
								// The tile at the co-ords has a matching class 
								return true;
							}
						} else {
							// The class name is blank so return true since all tiles on the tile-map
							// effectively have a blank class name attached to them
							return true;
						}
					}
				}
			} else {
				// There are no path classes for this tile map co-ordinate
				return false;
			}
		}
	},
	
	/** startPath - Adds the object to the process list so that movement will be processed against
	the object based upon its assigned path data. {
		category:"method",
		arguments: [{
			type:"multi",
			name:"obj",
			desc:"The item that you want to start processing path movement for (usually an entity). Either an object or a string id can be used to identify the item.",
		}, {
			type:"string",
			name:"typeId",
			desc:"Either a constant value of PATH_TYPE_ENTITY or PATH_TYPE_CAMERA denoting which type of item this call will be processed against.",
		}, {
			type:"integer",
			name:"startTime",
			desc:"The time in milliseconds when the movement along the path is at the beginning of the path. If you want path movement to start from the beginning of the path, this value is usually the result of a call to new Date().getTime().",
		}, {
			type:"bool",
			name:"autoStop",
			desc:"If set to true, the movement along the path will cease once the entire path has been traversed. Setting this to false will cause the path to be looped from start to end over and over again.",
		}, {
			type:"integer",
			name:"warnTime",
			desc:"The time in milliseconds before the end of the path is reached when the pathAlmostComplete event will be fired. This can be used to inform your script when a path is about to complete so that you can either create new points along the path to traverse or perform some other action before it ends.",
		}],
	} **/
	startPath: function (obj, typeId, startTime, autoStop, warnTime) {
		// Grab the object's path object
		var path = obj.path;
		
		// If we were passed a start time, assign it else default to the current time
		if (typeof(startTime) != 'undefined') {
			path.startTime = startTime;
		} else {
			path.startTime = new Date().getTime();
		}
		
		// Check if autoStop was specified and if not, default to true
		if (autoStop != null) {
			path.autoStop = autoStop;
		} else {
			path.autoStop = true;
		}
		
		// Check if warnTime was specified, calculate the timestamp where a warning should occur
		if (warnTime) {
			// Store the warnTime
			path.warnTime = warnTime;
			path.warnTimestamp = null;
			
			// Get all the path points so we can calculate the total time the path will take
			path.points = path.points || [];
			
			var pathPoints = path.points;
			
			// Calculate the warning timestamp
			var totalPathTime = 0;
			for (var i = 0; i < pathPoints.length; i++) {
				totalPathTime += pathPoints[i].dist / pathPoints[i].speed;
			}
			
			// Set the warn timestamp
			path.warnTimestamp = totalPathTime - (warnTime / 1000);
			
			// Sanity check the warning timestamp
			if (path.warnTimestamp < 1) {
				// Error because the warning time is more than the entire time to traverse the path
				this.log('The warnTime passed to startPath is greater that the entire time to traverse the currently defined path! Switching warning off!', 'warning', warnTime);
				
				// Set the warnTime to null so that we do not encounter any errors later on
				path.warnTime = null;
				path.warnTimestamp = null;
			} else {
				this.log('Starttime, Warntime', startTime, path.warnTimestamp);
				// When the warnTime is reached in the path currentTime, the pathAlmostComplete event
				// will fire for registered listeners.
			}
		}
		
		/* CEXCLUDE */
		if (this._sendNetData) {
			if (this.ige.isServer) {
				// TO-DO - This should not be hard-coded to use entity_id because in the future,
				// cameras will have paths too.
				if (this._sendNetData) {
					switch (obj.entity_locale) {
						case LOCALE_EVERYWHERE:
						case LOCALE_EVERYWHERE + LOCALE_DB:
							this.ige.network.send('pathsStart', [obj.entity_id, typeId, startTime, autoStop, warnTime]);
						break;
						
						case LOCALE_ALL_CLIENTS:
						case LOCALE_ALL_CLIENTS + LOCALE_DB:
							this.ige.network.send('pathsStart', [obj.entity_id, typeId, startTime, autoStop, warnTime]);
						break;
						
						case LOCALE_SINGLE_CLIENT:
						case LOCALE_SINGLE_CLIENT + LOCALE_DB:
							this.ige.network.send('pathsStart', [obj.entity_id, typeId, startTime, autoStop, warnTime], obj.session_id);
						break;
						
						case LOCALE_SERVER_ONLY:
						case LOCALE_SERVER_ONLY + LOCALE_DB:
							// Do nothing, it's server only
						break;
					}
				}
			}
		}
		/* CEXCLUDE */
		
		// Add the object to the process list so its movement will be path-processed
		this.processList[typeId] = this.processList[typeId] || [];
		this.processList[typeId].push(obj);
		//this.log('Path added to processing list, count is now: ' + this.processList[typeId].length);
	},
	
	/** resumePath - Used when an item is received over the network (such as an entity) and it includes path data.
	The creating class (such as IgeEntities) will detect that a path exists and call this method to ensure
	that the item is on the processList. Avoiding a situation when the item would be created but the path 
	data contained in it would not be used. {
		category:"method",
		arguments: [{
			type:"object",
			name:"obj",
			desc:"The item whose path is to be resumed.",
		}, {
			type:"integer",
			name:"typeId",
			desc:"The type constant value used to identify the type of item contained in the 'obj' argument.",
		}],
	} **/
	resumePath: function (obj, typeId) {
		// Add the object to the process list so its movement will be path-processed
		this.processList[typeId] = this.processList[typeId] || [];
		this.processList[typeId].push(obj);
	},
	
	/** stopPath - Removes the object from the process list so that movement will no longer be
	processed based upon its path. {
		category:"method",
		arguments: [{
			type:"object",
			name:"obj",
			desc:"The item whose path is to be stopped.",
		}, {
			type:"integer",
			name:"typeId",
			desc:"The type constant value used to identify the type of item contained in the 'obj' argument.",
		}],
	} **/
	stopPath: function (obj, typeId) {
		if (this.processList && this.processList[typeId]) {
			var index = this.processList[typeId].indexOf(obj);
			
			if (index > -1) {
				this.processList[typeId].splice(index, 1);
			}
		}
		
		/* CEXCLUDE */
		if (this._sendNetData) {
			if (this.ige.isServer) {
				// TO-DO - This should not be hard-coded to use entity_id because in the future,
				// cameras will have paths too.
				switch (obj.entity_locale) {
					case LOCALE_EVERYWHERE:
					case LOCALE_EVERYWHERE + LOCALE_DB:
						this.ige.network.send('pathsStop', [obj.entity_id, typeId]);
					break;
					
					case LOCALE_ALL_CLIENTS:
					case LOCALE_ALL_CLIENTS + LOCALE_DB:
						this.ige.network.send('pathsStop', [obj.entity_id, typeId]);
					break;
					
					case LOCALE_SINGLE_CLIENT:
					case LOCALE_SINGLE_CLIENT + LOCALE_DB:
						this.ige.network.send('pathsStop', [obj.entity_id, typeId], obj.session_id);
					break;
					
					case LOCALE_SERVER_ONLY:
					case LOCALE_SERVER_ONLY + LOCALE_DB:
						// Do nothing, it's server only
					break;
				}
				
			}
		}
		/* CEXCLUDE */
	},
	
	/** processPaths - Loop through the entries in the processList lookup array and process movement
	against each entry based upon their assigned path data. {
		category:"method",
		arguments: [{
			type:"integer",
			name:"currentTime",
			desc:"The current time in milliseconds used to calculate the position of movement along a path.",
		}],
	} **/
	processPaths: function  (currentTime) {
		if (!isNaN(currentTime)) {
			// Loop through the types
			var typeArr = this.processList;
			var typeCount = typeArr.length;
			
			for (typeCount in typeArr) {
				// Loop through the objects
				var objArr = this.processList[typeCount];
				var objCount = objArr.length;
				
				while (objCount--) {
					// Process object path movement
					var obj = objArr[objCount];
					//console.log('Processing object', obj);
					if (obj && obj.path != null) {
						var path = obj.path;
						var pathPos = this.positionAt(path, path.startTime, currentTime);
						
						if (typeCount == PATH_TYPE_ENTITY) {
							// Entity movement
							if (pathPos != null) {
								this.ige.entities.translate(obj, pathPos.x, pathPos.y);
							}
						}
						if (typeCount == PATH_TYPE_CAMERA) {
							// Camera movement
							if (pathPos != null) {
								this.ige.cameras.translate(obj, pathPos.x, pathPos.y, obj.camera_z);
							}
						}
						
						// Has the object completed its path?
						if ((path.points.length - 1) == 0 || (pathPos == path.points[path.points.length - 1] && currentTime > path.startTime)) {
							if (path.autoStop) {
								//this.log('Stopping path because it is complete.');
								this.stopPath(obj, typeCount);
							}
							
							this.emit('pathComplete', obj);
						}
					}
				}
			}
		} else {
			this.log('Path delta is NaN!', 'error', delta);
		}
	}
});