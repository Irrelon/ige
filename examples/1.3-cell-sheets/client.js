var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.addComponent(IgeEditorComponent);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		// Load a tile cell sheet and store it in the gameTexture array
		// When you create a cell sheet you pass the number of columns and rows
		// that make up the cells in the image. In this case the grassSheet.png
		// file has four columns and one row. The cell sheet then automatically
		// "cuts" up the image into individual cells that you can use for an entity.
		gameTexture[0] = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);

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
						.id('entity1')
						.depth(1)
						// Set the entity texture to the cell sheet we created earlier
						.texture(gameTexture[0])
						// Set the cell to 1... this is the FIRST cell in the sheet
						.cell(1)
						// Set the entity's width and height to match the cell we are using
						.dimensionsFromCell()
						.translateTo(0, 0, 0)
						.mount(ige.$('baseScene'));

					self.obj[1] = new IgeEntity()
						.id('entity2')
						.depth(1)
						// Set the entity texture to the cell sheet we created earlier
						.texture(gameTexture[0])
						// Set the cell to 4... this is the FOURTH cell in the sheet
						.cell(4)
						// Set the entity's width and height to match the cell we are using
						.dimensionsFromCell()
						.translateTo(0, 50, 0)
						.mount(ige.$('baseScene'));
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }