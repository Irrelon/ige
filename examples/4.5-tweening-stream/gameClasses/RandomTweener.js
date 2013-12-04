var RandomTweener = IgeEntity.extend({
	classId: 'RandomTweener',

	init: function () {
		var self = this,
			overFunc,
			outFunc;

		IgeEntity.prototype.init.call(this);

		if (ige.isClient) {
			this.depth(ige.client.scene1._children.length);
			
			// Define the texture this entity will use
			this._tex = new IgeTexture('../assets/textures/sprites/fairy.png');

			// Wait for the texture to load
			this._tex.on('loaded', function () {
				self.texture(self._tex)
					.dimensionsFromCell();

				self.width(100)
					.height(100);

				// Define a function that will be called when the
				// mouse cursor moves over one of our entities
				overFunc = function () {
					this.highlight(true);
					this.drawBounds(true);
					this.drawBoundsData(true);
				};

				// Define a function that will be called when the
				// mouse cursor moves away from one of our entities
				outFunc = function () {
					this.highlight(false);
					this.drawBounds(false);
					this.drawBoundsData(false);
				};

				self.mouseOver(overFunc)
					.mouseOut(outFunc)
					.drawBounds(false)
					.drawBoundsData(false);

			}, false, true);
		}

		if (ige.isServer) {
			this.newTween();
		}
	},

	/**
	 * Creates a new random position and rotation to tween
	 * to and then starts the tween.
	 */
	newTween: function () {
		var self = this;

		this._translate.tween()
			.duration(7000)
			.stepTo({
				x: (Math.random() * 1440) - 720,
				y: (Math.random() * 900) - 450
			})
			.easing('outElastic')
			.afterTween(function () {
				self.newTween();
			})
			.start();

		this._rotate.tween()
			.duration(7000)
			.stepBy({z: (Math.random() * 360) * Math.PI / 180})
			.easing('outElastic')
			.start();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = RandomTweener; }