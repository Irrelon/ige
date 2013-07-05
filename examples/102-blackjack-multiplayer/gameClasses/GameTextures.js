var GameTextures = IgeEventingClass.extend({
	classId: 'GameTextures',
	
	init: function () {
		// Load all the textures we need to start the game
		this._textures = {
			game: {
				cardBack: new IgeTexture('./assets/textures/sprites/cardBack2.png'),
				cards: new IgeCellSheet('./assets/textures/sprites/cardSheet.png', 13, 4),
				chips: new IgeCellSheet('./assets/textures/sprites/chipsSheet.png', 5, 2)
			},
			ui: {
				loginBackground: new IgeTexture('./assets/textures/backgrounds/teal.jpg'),
				tableBackground: new IgeTexture('./assets/textures/backgrounds/tableExtended.png'),
				buttons: new IgeCellSheet('./assets/textures/ui/buttons2.png', 2, 2)
			}
		}
	},
	
	tex: function (type, name) {
		return this._textures[type][name];
	}
});