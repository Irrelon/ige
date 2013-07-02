var GameTextures = IgeEventingClass.extend({
	classId: 'GameTextures',
	
	init: function () {
		this._textures = {};
		
		// Load all the textures we need to start the game
		this._textures.ui = {
			loginBackground: new IgeTexture('../assets/textures/backgrounds/teal.jpg'),
			tableBackground: new IgeTexture('../assets/textures/backgrounds/tableExtended.png')
		}
	}
});