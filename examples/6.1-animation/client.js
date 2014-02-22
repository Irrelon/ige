var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		//ige.debugEnabled(false);
		//ige.debugTiming(false);

		// Load our textures
		var self = this,
			tt, i,
			overFunc, outFunc;

		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Ask the engine to start and wait for a callback with a success flag
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Create the scene
				self.scene1 = new IgeScene2d()
					.id('scene1');

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.id('vp1')
					.autoSize(true)
					.scene(self.scene1)
					.drawBounds(true)
					.drawBoundsData(true)
					.mount(ige);

				overFunc = function () {
					this.highlight(true);
					this.drawBounds(true);
					this.drawBoundsData(true);
				};

				outFunc = function () {
					this.highlight(false);
					this.drawBounds(false);
					this.drawBoundsData(false);
				};

				for (i = 0; i < 200; i++) {
					// Create a new character
					self.obj[i] = new RandomMovingCharacter()
						.setType(Math.random() * 8 | 0)
						.drawBounds(false)
						.drawBoundsData(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.walkTo(
							(Math.random() * ige._bounds2d.x) - ige._bounds2d.x2,
							(Math.random() * ige._bounds2d.y) - ige._bounds2d.y2
						)
						.mount(self.scene1);
				}
				
				// Create a single animating entity with some event listeners to
				// receive updates during the animation cycle
				self.singleAnim = new RandomMovingCharacter()
						.setType(Math.random() * 8 | 0)
						.drawBounds(false)
						.drawBoundsData(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.walkTo(
							(Math.random() * ige._bounds2d.x) - ige._bounds2d.x2,
							(Math.random() * ige._bounds2d.y) - ige._bounds2d.y2
						)
						.mount(self.scene1);
				
				// In each animation callback / event...
				// this = the entity's animation component instance
				// anim = the animation component's _anim object
				// this._entity = the entity the animation component is attached to
				self.singleAnim.animation.on('started', function (anim) {
					// The animation starts.
					console.log('started', this, anim);
				});
				
				self.singleAnim.animation.on('loopComplete', function (anim) {
					// The animation has completed a full cycle (shown all frames).
					console.log('loopComplete', this, anim);
					
					// Now we've completed a single loop, stop the animation
					this.stop();
					
					// And stop the entity from walking around
					this._entity.unMount();
				});
				
				self.singleAnim.animation.on('complete', function (anim) {
					// The animation has completed all assigned loop cycles.
					console.log('complete', this, anim);
				});				
				
				self.singleAnim.animation.on('stopped', function (anim) {
					// The animation ends or is stopped.
					console.log('stopped', this, anim);
				});
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }