// Define our player character classes
var Character = IgeEntity.extend({
	classId: 'Character',

	init: function () {
		var self = this;
		IgeEntity.prototype.init.call(this);
		
		if (ige.isClient) {
			// Setup the entity
			self.addComponent(IgeAnimationComponent)
				.depth(1);
			
			// Load the character texture file
			this._characterTexture = new IgeCellSheet('../assets/textures/sprites/vx_chara02_c.png', 12, 8);
	
			// Wait for the texture to load
			this._characterTexture.on('loaded', function () {
				self.texture(self._characterTexture)
					.dimensionsFromCell();
				
				self.setType(0);
			}, false, true);
		}
		
		this._lastTranslate = this._translate.clone();
		
		// Was debugging so setting a trace - turned off now, found bug in path component
		// under specific conditions
		//ige.traceSet(this._translate, 'x', 5);
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
				this.animation.define('S', [1, 2, 3, 2], 8, -1)
					.animation.define('W', [13, 14, 15, 14], 8, -1)
					.animation.define('E', [25, 26, 27, 26], 8, -1)
					.animation.define('N', [37, 38, 39, 38], 8, -1)
					.cell(1);

				this._restCell = 1;
				break;

			case 1:
				this.animation.define('S', [4, 5, 6, 5], 8, -1)
					.animation.define('W', [16, 17, 18, 17], 8, -1)
					.animation.define('E', [28, 29, 30, 29], 8, -1)
					.animation.define('N', [40, 41, 42, 41], 8, -1)
					.cell(4);

				this._restCell = 4;
				break;

			case 2:
				this.animation.define('S', [7, 8, 9, 8], 8, -1)
					.animation.define('W', [19, 20, 21, 20], 8, -1)
					.animation.define('E', [31, 32, 33, 32], 8, -1)
					.animation.define('N', [43, 44, 45, 44], 8, -1)
					.cell(7);

				this._restCell = 7;
				break;

			case 3:
				this.animation.define('S', [10, 11, 12, 11], 8, -1)
					.animation.define('W', [22, 23, 24, 23], 8, -1)
					.animation.define('E', [34, 35, 36, 35], 8, -1)
					.animation.define('N', [46, 47, 48, 47], 8, -1)
					.cell(10);

				this._restCell = 10;
				break;

			case 4:
				this.animation.define('S', [49, 50, 51, 50], 8, -1)
					.animation.define('W', [61, 62, 63, 62], 8, -1)
					.animation.define('E', [73, 74, 75, 74], 8, -1)
					.animation.define('N', [85, 86, 87, 86], 8, -1)
					.cell(49);

				this._restCell = 49;
				break;

			case 5:
				this.animation.define('S', [52, 53, 54, 53], 8, -1)
					.animation.define('W', [64, 65, 66, 65], 8, -1)
					.animation.define('E', [76, 77, 78, 77], 8, -1)
					.animation.define('N', [88, 89, 90, 89], 8, -1)
					.cell(52);

				this._restCell = 52;
				break;

			case 6:
				this.animation.define('S', [55, 56, 57, 56], 8, -1)
					.animation.define('W', [67, 68, 69, 68], 8, -1)
					.animation.define('E', [79, 80, 81, 80], 8, -1)
					.animation.define('N', [91, 92, 93, 92], 8, -1)
					.cell(55);

				this._restCell = 55;
				break;

			case 7:
				this.animation.define('S', [58, 59, 60, 59], 8, -1)
					.animation.define('W', [70, 71, 72, 71], 8, -1)
					.animation.define('E', [82, 83, 84, 83], 8, -1)
					.animation.define('N', [94, 95, 96, 95], 8, -1)
					.cell(58);

				this._restCell = 58;
				break;
		}

		return this;
	},

	destroy: function () {
		// Destroy the texture object
		if (this._characterTexture) {
			this._characterTexture.destroy();
		}

		// Call the super class
		IgeEntity.prototype.destroy.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Character; }