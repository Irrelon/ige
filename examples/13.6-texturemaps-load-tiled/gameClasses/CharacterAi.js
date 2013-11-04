// Define our AI character classes
var CharacterAi = Character.extend({
	classId: 'CharacterAi',

	init: function (collisionMap, pathFinder) {
		var self = this,
			newPathMethod;

		Character.prototype.init.call(this);

		this.pathFinder = pathFinder;
		this.collisionMap = collisionMap;

		// Choose a random character type
		this.setType(Math.random() * 8 | 0);

		// Add pathing capabilities
		this.addComponent(IgePathComponent)
			.path.drawPath(false); // Enable drawing the current path

		// Hook the path events
		newPathMethod = function () {
			self.newPath();
		};

		this.path.on('traversalComplete', newPathMethod);

		// Hook when we get mounted
		this.on('mounted', function (parent) {
			// Start the first path!
			self.pathNextUpdate = true;
		});
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
			self.pathNextUpdate = true;
			return;
		}

		if (!this.collisionMap.map._mapData[destTileY] || !tileChecker(this.collisionMap.map._mapData[destTileY][destTileX])) {
			self.pathNextUpdate = true;
			return;
		}

		destTile = new IgePoint(destTileX, destTileY, 0);
		path = self.pathFinder.aStar(self.collisionMap, currentTile, destTile, tileChecker, true, false);

		if (path.length) {
			// Assign the path to the player and start it
			self.path.clear()
				.path.add(path)
				.path.start();

			self.pathNextUpdate = false;
		} else {
			self.pathNextUpdate = true;
		}
	},

	update: function (ctx) {
		if (this.pathNextUpdate) {
			this.newPath();
		}

		Character.prototype.update.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = CharacterAi; }