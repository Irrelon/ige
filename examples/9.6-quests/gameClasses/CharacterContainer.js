// Define our player character container classes
var CharacterContainer = IgeEntity.extend({
	classId: 'CharacterContainer',

	init: function () {
		var self = this;
		IgeEntity.prototype.init.call(this);

		// Setup the entity 3d bounds
		self.size3d(20, 20, 40);

		// Create a character entity as a child of this container
		self.character = new Character()
			.id(this.id() + '_character')
			.setType(3)
			.drawBounds(false)
			.drawBoundsData(false)
			.originTo(0.5, 0.6, 0.5)
			.mount(this);
	},

	update: function (ctx) {
		// Set the depth to the y co-ordinate which basically
		// makes the entity appear further in the foreground
		// the closer they become to the bottom of the screen
		this.depth(this._translate.y);
		
		// Make sure the character is animating in the correct
		// direction
		var dir = this.path.currentDirection();
		
		if (dir && (dir !== this._currentDir || !this.character.animation.playing())) {
			this._currentDir = dir;
			
			// The characters we are using only have four directions
			// so convert the NW, SE, NE, SW to N, S, E, W
			switch (dir) {
				case 'SW':
					dir = 'W';
					break;
				
				case 'SE':
					dir = 'E';
					break;
				
				case 'NW':
					dir = 'W';
					break;
				
				case 'NE':
					dir = 'E';
					break;
			}
			
			this.character.animation.start(dir);
		}
		
		IgeEntity.prototype.update.call(this, ctx);
	},
	
	tick: function (ctx) {
		// Work out which tile we're over and if it's different from
		// the last one we were over, emit an overTile event
		var currentPosition = this._translate,
			curTile;

		// Calculate which tile our character is currently "over"
		if (this._parent.isometricMounts()) {
			curTile = this._parent.pointToTile(currentPosition.toIso());
		} else {
			curTile = this._parent.pointToTile(currentPosition);
		}

		// Compare the last tile to the current one
		if (!curTile.compare(this._overTile)) {
			// Different over tile
			this._overTile = curTile;
			this.emit('overTile', this._overTile);
		}

		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = CharacterContainer; }