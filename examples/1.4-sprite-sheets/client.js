var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this;
		self.gameTexture = [];

		this.obj = [];

		// Load the sprite sheet texture and store it in the gameTexture array
		self.gameTexture[0] = new IgeSpriteSheet('../assets/textures/tiles/future-joy-tilee.png', [
			// Format of the sprite area is x, y, width, height
			[5, 32, 22, 31],
			[128, 101, 96, 52]
		]);

		// Load the sprite sheet and also assign cell ids to each cell
		self.gameTexture[1] = new IgeSpriteSheet('../assets/textures/tiles/future-joy-tilee.png', [
			// Format of the sprite area is x, y, width, height
			[5, 32, 22, 31, 'table'],
			[128, 101, 96, 52, 'panel']
		]);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('sprite1')
						.depth(1)
						// Assign the sprite sheet texture to the entity
						.texture(self.gameTexture[0])
						// Assign cell 1 as the entity's texture cell
						.cell(1)
						// Apply the dimensions from the cell to the entity
						// so that the entity's width and height now match that
						// of the cell being used
						.dimensionsFromCell()
						.translateTo(0, 0, 0)
						.mount(self.scene1);

					self.obj[1] = new IgeEntity()
						.id('sprite2')
						.depth(1)
						// Assign the sprite sheet texture to the entity.
						// Notice we are using the gameTexture[1] instead of the
						// gameTexture[0] as in the entity above. This allows us
						// to use the cell ids that were defined via the
						// IgeSpriteSheet definition on line 20 using cellById()
						// instead of specifying the cell index via cell()
						.texture(self.gameTexture[1])
						// Assign cell by id "panel" as the entity's texture cell
						// this is possible using the cellById() method which reads
						// the assigned cell ids from the texture definition and
						// then maps it to the cell index that it corresponds to
						.cellById('panel')
						// Apply the dimensions from the cell to the entity
						// so that the entity's width and height now match that
						// of the cell being used
						.dimensionsFromCell()
						.translateTo(100, 0, 0)
						.mount(self.scene1);

					// Create one more entity and animate between the table and
					// panel cells using cell ids in the animation, this tests
					// that cell-id based frames will animate correctly
					self.obj[2] = new IgeEntity()
						.id('sprite3')
						.addComponent(IgeAnimationComponent)
						.depth(1)
						// Assign the sprite sheet texture to the entity.
						// Notice we are using the gameTexture[1] instead of the
						// gameTexture[0] as in the entity above. This allows us
						// to use the cell ids that were defined via the
						// IgeSpriteSheet definition on line 20 using cellById()
						// instead of specifying the cell index via cell()
						.texture(self.gameTexture[1])
						// Assign cell by id "panel" as the entity's texture cell
						// this is possible using the cellById() method which reads
						// the assigned cell ids from the texture definition and
						// then maps it to the cell index that it corresponds to
						.cellById('panel')
						// Apply the dimensions from the cell to the entity
						// so that the entity's width and height now match that
						// of the cell being used
						.dimensionsFromCell()
						.translateTo(100, 100, 0)
						.animation.define('test', ['panel', 'table', null], 1, -1, true)
						.animation.select('test')
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }