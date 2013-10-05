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
			// Format of the sprite bounding rectangle array is x, y, width, height
			[5, 32, 22, 31],
			[128, 101, 96, 52]
		]);

		// Load the sprite sheet and also assign cell ids to each cell
		self.gameTexture[1] = new IgeSpriteSheet('../assets/textures/tiles/future-joy-tilee.png', [
			// Format of the sprite area is x, y, width, height
			[5, 32, 22, 31, 'table'],
			[128, 101, 96, 52, 'panel']
		]);

		// Because the shrubbery image has distinct bounds around each sprite image, we
		// can ask the engine to detect the sprite bounds for us by not providing them
		// so here we load the shrubbery image but do not pass any sprite area data!
		self.gameTexture[3] = new IgeSpriteSheet('../assets/textures/tiles/shrubbery.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph('IgeBaseScene');

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
						.translateTo(0, -100, 0)
						.mount(ige.$('baseScene'));

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
						.translateTo(100, -100, 0)
						.mount(ige.$('baseScene'));

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
						.translateTo(100, 0, 0)
						.animation.define('test', ['panel', 'table', null], 1, -1, true)
						.animation.select('test')
						.mount(ige.$('baseScene'));

					// Create a new separate texture from the cell of one of the sprite sheets!
					self.gameTexture[2] = self.gameTexture[1].textureFromCell('panel');

					// Create another entity using the new texture
					self.obj[3] = new IgeEntity()
						.id('sprite4')
						.texture(self.gameTexture[2])
						.dimensionsFromTexture()
						.translateTo(-100, 0, 0)
						.mount(ige.$('baseScene'));

					var xAdj = 0,
						xAdj2 = 0;
					for (var i = 1; i < self.gameTexture[3].cellCount(); i++) {
						if (i > 1) {
							xAdj += self.gameTexture[3]._cells[i][2] / 2;
						}

						new IgeEntity()
							.texture(self.gameTexture[3])
							.cell(i)
							.dimensionsFromCell()
							.translateTo(-450 + xAdj + xAdj2, 130, 0)
							.mount(ige.$('baseScene'));

						xAdj += (self.gameTexture[3]._cells[i][2] / 2) + 5;
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }