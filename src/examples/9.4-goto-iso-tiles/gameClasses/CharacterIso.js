// Define our player character container classes
var Character = IgeEntity.extend({
	classId: 'Character',

	init: function () {
		IgeEntity.prototype.init.call(this);

		var self = this;
		
		// Create a character entity as a child of this container
		self.isometric(true)
			.addComponent(IgeAnimationComponent)
			.addComponent(IgeVelocityComponent)
			.depth(1)
			.setType(3)
			.bounds3d(20, 20, 40)
			.anchor(0, 8);

		// Load the character texture file
		this._characterTexture = new IgeCellSheet('../assets/textures/sprites/vx_chara02_c.png', 12, 8);

		// Wait for the texture to load
		this._characterTexture.on('loaded', function () {
			self.texture(self._characterTexture)
				.dimensionsFromCell();
		}, false, true);
	},
	
	/**
	 * Sets the type of character which determines the character's
	 * animation sequences and appearance.
	 * @param {Number} type From 0 to 7, determines the character's
	 * appearance.
	 * @return {*}
	 */
	setType: function (type) {
		switch (type) {
			case 0:
				this.animation.define('walkDown', [1, 2, 3, 2], 8, -1)
					.animation.define('walkLeft', [13, 14, 15, 14], 8, -1)
					.animation.define('walkRight', [25, 26, 27, 26], 8, -1)
					.animation.define('walkUp', [37, 38, 39, 38], 8, -1)
					.cell(1);

				this._restCell = 1;
				break;

			case 1:
				this.animation.define('walkDown', [4, 5, 6, 5], 8, -1)
					.animation.define('walkLeft', [16, 17, 18, 17], 8, -1)
					.animation.define('walkRight', [28, 29, 30, 29], 8, -1)
					.animation.define('walkUp', [40, 41, 42, 41], 8, -1)
					.cell(4);

				this._restCell = 4;
				break;

			case 2:
				this.animation.define('walkDown', [7, 8, 9, 8], 8, -1)
					.animation.define('walkLeft', [19, 20, 21, 20], 8, -1)
					.animation.define('walkRight', [31, 32, 33, 32], 8, -1)
					.animation.define('walkUp', [43, 44, 45, 44], 8, -1)
					.cell(7);

				this._restCell = 7;
				break;

			case 3:
				this.animation.define('walkDown', [10, 11, 12, 11], 8, -1)
					.animation.define('walkLeft', [22, 23, 24, 23], 8, -1)
					.animation.define('walkRight', [34, 35, 36, 35], 8, -1)
					.animation.define('walkUp', [46, 47, 48, 47], 8, -1)
					.cell(10);

				this._restCell = 10;
				break;

			case 4:
				this.animation.define('walkDown', [49, 50, 51, 50], 8, -1)
					.animation.define('walkLeft', [61, 62, 63, 62], 8, -1)
					.animation.define('walkRight', [73, 74, 75, 74], 8, -1)
					.animation.define('walkUp', [85, 86, 87, 86], 8, -1)
					.cell(49);

				this._restCell = 49;
				break;

			case 5:
				this.animation.define('walkDown', [52, 53, 54, 53], 8, -1)
					.animation.define('walkLeft', [64, 65, 66, 65], 8, -1)
					.animation.define('walkRight', [76, 77, 78, 77], 8, -1)
					.animation.define('walkUp', [88, 89, 90, 89], 8, -1)
					.cell(52);

				this._restCell = 52;
				break;

			case 6:
				this.animation.define('walkDown', [55, 56, 57, 56], 8, -1)
					.animation.define('walkLeft', [67, 68, 69, 68], 8, -1)
					.animation.define('walkRight', [79, 80, 81, 80], 8, -1)
					.animation.define('walkUp', [91, 92, 93, 92], 8, -1)
					.cell(55);

				this._restCell = 55;
				break;

			case 7:
				this.animation.define('walkDown', [58, 59, 60, 59], 8, -1)
					.animation.define('walkLeft', [70, 71, 72, 71], 8, -1)
					.animation.define('walkRight', [82, 83, 84, 83], 8, -1)
					.animation.define('walkUp', [94, 95, 96, 95], 8, -1)
					.cell(58);

				this._restCell = 58;
				break;
		}

		return this;
	},

	/**
	 * Tweens the character to the specified world co-ordinates.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	walkTo: function (x, y) {
		var self = this,
			distX = x - this.translate().x(),
			distY = y - this.translate().y(),
			distance = Math.distance(
				this.translate().x(),
				this.translate().y(),
				x,
				y
			),
			speed = 0.1,
			time = (distance / speed),
			direction = '';

		// Set the animation based on direction - these are modified
		// for isometric views
		if (distY < 0) {
			direction += 'N';
		}

		if (distY > 0) {
			direction += 'S';
		}

		if (distX > 0) {
			direction += 'E';
		}

		if (distX < 0) {
			direction += 'W';
		}

		switch (direction) {
			case 'N':
				this.animation.select('walkRight');
				break;

			case 'S':
				this.animation.select('walkLeft');
				break;

			case 'E':
				this.animation.select('walkRight');
				break;

			case 'W':
				this.animation.select('walkLeft');
				break;

			case 'SE':
				this.animation.select('walkDown');
				break;

			case 'NW':
				this.animation.select('walkUp');
				break;

			case 'NE':
				this.animation.select('walkRight');
				break;

			case 'SW':
				this.animation.select('walkLeft');
				break;
		}

		// Start tweening the little person to their destination
		this._translate.tween()
			.stopAll()
			.properties({x: x, y: y})
			.duration(time)
			.afterTween(function () {
				self.animation.stop();
			})
			.start();

		return this;
	},

	tick: function (ctx) {
		// Set the depth to the y co-ordinate which basically
		// makes the entity appear further in the foreground
		// the closer they become to the bottom of the screen
		this.depth(this._translate.y);
		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Character; }