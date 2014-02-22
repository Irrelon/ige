// Define our AI character classes
var CharacterAi = Character.extend({
	classId: 'CharacterAi',

	init: function (collisionMap, pathFinder) {
		var self = this,
			newPathMethod;

		Character.prototype.init.call(this);

		// Choose a random character type
		this.setType(Math.random() * 8 | 0);

		if (ige.isServer) {
			this.pathFinder = pathFinder;
			this.collisionMap = collisionMap;

			// Add pathing capabilities
			this.addComponent(IgePathComponent)
				.path.drawPath(true); // Enable drawing the current path

			// Hook the path events
			newPathMethod = function () {
				self.newPath();
			};

			this.path.on('traversalComplete', newPathMethod);

			// Hook when we get mounted
			this.on('mounted', function (parent) {
				// Start the first path!
				self.pathNextTick = true;
			});
		}
	},

	newPath: function () {
		var self = this,
			currentTile,
			destTileX,
			destTileY,
			destTile,
			path = [],
			tileChecker = function (tileData, tileX, tileY) {
				// If the map tile data is set, don't path along it
				return !tileData;
			};

		// Calculate which tile our character is currently "over"
		currentTile = this._parent.pointToTile(this._translate.toIso());

		// Pick a random destination tile
		destTileX = currentTile.x + ((Math.random() * 20 | 0) - 10);
		destTileY = currentTile.y + ((Math.random() * 20 | 0) - 10);

		if (destTileX < 0 || destTileY < 0) {
			self.pathNextTick = true;
			return;
		}

		if (!this.collisionMap.map._mapData[destTileY] || !tileChecker(this.collisionMap.map._mapData[destTileY][destTileX])) {
			self.pathNextTick = true;
			return;
		}

		destTile = new IgePoint3d(destTileX, destTileY, 0);
		path = self.pathFinder.generate(self.collisionMap, currentTile, destTile, tileChecker, true, false);

		if (path.length) {
			// Assign the path to the player and start it
			self.path.clear()
				.path.add(path)
				.path.start();

			self.pathNextTick = false;
		} else {
			self.pathNextTick = true;
		}
	},

	tick: function (ctx) {
		if (this.pathNextTick) {
			this.newPath();
		}

		Character.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = CharacterAi; }