var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.globalSmoothing(true);

		// Load our textures
		var self = this;
		this.obj = [];

		ige.addComponent(IgeEditorComponent);
		
		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				ige.addGraph('IgeBaseScene');
				
				var baseScene = ige.$('baseScene');
				
				// Define a function that will be called when the
				// mouse cursor moves over one of our entities
				overFunc = function () {
					this.highlight(true);
					/*this.drawBounds(true);
					this.drawBoundsData(true);*/
				};

				// Define a function that will be called when the
				// mouse cursor moves away from one of our entities
				outFunc = function () {
					this.highlight(false);
					/*this.drawBounds(false);
					this.drawBoundsData(false);*/
				};

				// Create an isometric tile map
				self.tileMap1 = new IgeTileMap2d()
					.id('tileMap1')
					.isometricMounts(true)
					.tileWidth(40)
					.tileHeight(40)
					.drawGrid(3)
					.drawMouse(true)
					.mount(baseScene);

				// Create the 3d container that the player
				// entity will be mounted to
				self.player = new Character()
					.id('player')
					.addComponent(PlayerComponent)
					.isometric(true)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.mount(self.tileMap1);
				
				self.player.triggerPolygon('bounds3dPolygon');

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				ige.$('vp1').camera.trackTranslate(self.player, 100);
				ige.$('vp1').drawBounds(true);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }