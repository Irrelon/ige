// Define our AI character classes
var CharacterAi = Character.extend({
	classId: 'CharacterAi',

	init: function (collisionMap, pathFinder) {
		var self = this,
			newPathMethod;

		Character.prototype.init.call(this);

		this.collisionMap = collisionMap;
		this.tileChecker = function (tileData, tileX, tileY) {
			// If the map tile data is set, don't path along it
			return !tileData;
		};

		// Choose a random character type
		this.setType(Math.random() * 8 | 0);

		// Add pathing capabilities
		this.addComponent(IgePathComponent).path
			.speed(2)
			.finder(pathFinder)
			.tileMap(this.collisionMap)
			.tileChecker(this.tileChecker)
			.drawPath(true); // Enable drawing the current path

		// Hook the path events
		newPathMethod = function () {
			self.newPath();
		};

		this.path.on('pathComplete', newPathMethod);

		// Hook when we get mounted
		this.on('mounted', function (parent) {
			// Start the first path!
			self.pathNextTick = true;
		});
	},

	newPath: function () {
		var self = this,
			currentTile,
			destTileX,
			destTileY;

		// Calculate which tile our character is currently "over"
		currentTile = this._parent.pointToTile(this._translate);

		// Pick a random destination tile
		destTileX = currentTile.x + ((Math.random() * 20 | 0) - 10);
		destTileY = currentTile.y + ((Math.random() * 20 | 0) - 10);

		if (destTileX < 0 || destTileY < 0) {
			self.pathNextTick = true;
			return;
		}

		if (!this.collisionMap.map._mapData[destTileY] || !this.tileChecker(this.collisionMap.map._mapData[destTileY][destTileX])) {
			self.pathNextTick = true;
			return;
		}

			// Assign the path to the player and start it
		self.path
			.clear()
			.add(destTileX, destTileY, 0)
			.start();

		self.pathNextTick = false;
	},

	tick: function (ctx) {
		if (this.pathNextTick) {
			this.newPath();
		}

		Character.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = CharacterAi; }