var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		// Setup the tweening component on the engine
		ige.addComponent(IgeTweenComponent);

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeCellSheet('../assets/textures/ui/icon_entity.png', 2, 1);
		gameTexture[2] = new IgeFontSheet('../assets/textures/fonts/verdana_12pt.png', 0);
		gameTexture[3] = new IgeFontSheet('../assets/textures/fonts/verdana_10pt.png', 0);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Add base scene data to graph
					ige.addGraph('IgeBaseScene');

					// Create the UI scene
					self.uiScene = new IgeScene2d()
						.id('uiScene')
						.depth(1)
						.ignoreCamera(true)
						.mount(ige.$('baseScene'));
					
					ige.ui.style('.div', {
						'backgroundColor': '#000000',
						'borderColor': '#ffffff',
						'borderWidth': 1,
						'borderRadius': 5,
						'width': 300,
						'height': 24,
						'left': '10%',
						'top': '10%',
						'bottom': '10%',
						'right': '10%'
					});
					
					ige.ui.style('.div:hover', {
						'borderColor': '#ffff00'
					});
					
					ige.ui.style('.div:active', {
						'borderColor': '#ff0000'
					});
					
					ige.ui.style('#div2', {
						'backgroundColor': '#333333',
						'bottom': null,
						'right': null,
						'width': 300,
						'height': 30,
						'top': 10,
						'left': 10
					});
					
					ige.ui.style('#div3', {
						'backgroundColor': '#333333',
						'bottom': null,
						'right': null,
						'width': 300,
						'height': 30,
						'top': 50,
						'left': 10
					});
					
					ige.ui.style('#div2:focus', {
						'borderColor': '#00ff00'
					});
					
					ige.ui.style('#div3:focus', {
						'borderColor': '#00ff00'
					});

					var div1 = new IgeUiElement()
						.id('div1')
						.styleClass('div')
						.allowHover(false)
						.allowActive(false)
						.allowFocus(true)
						.mount(self.uiScene);
					
					new IgeUiTextBox()
						.id('div2')
						.styleClass('div')
						.fontSheet(gameTexture[3])
						.value('Text box 1')
						.mount(div1);
					
					new IgeUiTextBox()
						.id('div3')
						.styleClass('div')
						.fontSheet(gameTexture[3])
						.value('Text box 2')
						.mount(div1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }