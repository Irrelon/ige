var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this;
		
		this.gameTexture = {};
		this.obj = [];

		// Setup the tweening component on the engine
		ige.addComponent(IgeTweenComponent);

		this.gameTexture.fairy = new IgeTexture('../assets/textures/sprites/fairy.png');
		this.gameTexture.icon = new IgeCellSheet('../assets/textures/ui/icon_entity.png', 2, 1);
		this.gameTexture.verdana_10pt = new IgeFontSheet('../assets/textures/fonts/verdana_10pt.png', 0);
		this.gameTexture.verdana_12pt = new IgeFontSheet('../assets/textures/fonts/verdana_12pt.png', 0);
		this.gameTexture.metronic = new IgeTexture('../assets/textures/ui/metronic.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Add base scene data to graph
					ige.addGraph('IgeBaseScene');
					
					ige.$('vp1').addComponent(IgeMouseZoomComponent)
						.mouseZoom.enabled(true);

					// Create the UI scene
					self.uiScene = new IgeScene2d()
						.id('uiScene')
						.depth(1)
						.ignoreCamera(true)
						.mount(ige.$('baseScene'));
					
					ige.ui.style('#topNav', {
						'backgroundColor': '#212121',
						'top': 0,
						'left': 0,
						'right': 0,
						'height': 42
					});
					
					ige.ui.style('#leftNav', {
						'backgroundColor': '#3d3d3d',
						'top': 42,
						'left': 0,
						'width': 225,
						'bottom': 0
					});
					
					ige.ui.style('#main', {
						'backgroundColor': '#ffffff',
						'left': 225,
						'right': 0,
						'top': 42,
						'bottom': 0
					});
					
					ige.ui.style('#logo', {
						'backgroundImage': self.gameTexture.metronic,
						'backgroundRepeat': 'no-repeat',
						'middle': 0,
						'left': 20,
						'width': 86,
						'height': 14
					});
					
					ige.ui.style('.title', {
						'font': '3em Open Sans',
						'color': '#666666',
						'width': 200,
						'height': 40,
						'top': 10,
						'left': 10
					});
					
					ige.ui.style('.subTitle', {
						'font': 'lighter 16px Open Sans',
						'color': '#666666',
						'width': 400,
						'height': 40,
						'top': 40,
						'left': 11
					});
					
					ige.ui.style('IgeUiTextBox', {
						'backgroundColor': '#ffffff',
						'borderColor': '#212121',
						'borderWidth': 1,
						'bottom': null,
						'right': null,
						'width': 300,
						'height': 30,
						'left': 15,
						'font': '12px Open Sans',
						'color': '#000000'
					});
					
					ige.ui.style('#textBox1', {
						'top': 140
					});
					
					ige.ui.style('#textBox2', {
						'top': 180
					});
					
					ige.ui.style('#textBox1:focus', {
						'borderColor': '#00ff00'
					});
					
					ige.ui.style('#textBox2:focus', {
						'borderColor': '#00ff00'
					});
					
					ige.ui.style('#dashBar', {
						'backgroundColor': '#eeeeee',
						'top': 80,
						'left': 15,
						'right': 15,
						'height': 40
					});
					
					ige.ui.style('IgeUiLabel', {
						'font': '12px Open Sans',
						'color': '#000000'
					});
					
					ige.ui.style('#homeLabel', {
						'font': '14px Open Sans',
						'color': '#333333'
					});
					
					ige.ui.style('#button1', {
						'width': 80,
						'height': 30,
						'top': 220,
						'left': 15,
						'backgroundColor': '#ccc'
					});
					
					var topNav = new IgeUiElement()
						.id('topNav')
						.mount(self.uiScene);
					
					new IgeUiElement()
						.id('logo')
						.mount(topNav);
					
					var leftNav = new IgeUiElement()
						.id('leftNav')
						.mount(self.uiScene);
					
					var main = new IgeUiElement()
						.id('main')
						.mount(self.uiScene);
					
					new IgeUiDropDown()
						.id('optionsDropDown')
						.top(10)
						.left(10)
						.right(10)
						.options([{
							text: 'Test 1',
							value: 'test1'
						}, {
							text: 'Test 2',
							value: 'test2'
						}, {
							text: 'Test 3',
							value: 'test3'
						}])
						.mount(leftNav);
					
					new IgeUiLabel()
						.value('Dashboard')
						.styleClass('title')
						.mount(main);
					
					new IgeUiLabel()
						.value('Login with your username and password')
						.styleClass('subTitle')
						.mount(main);
					
					var dashBar = new IgeUiElement()
						.id('dashBar')
						.mount(main);
					
					new IgeUiLabel()
						.id('homeLabel')
						.value('Home')
						.width(100)
						.height(40)
						.left(0)
						.top(0)
						.mount(dashBar);
					
					new IgeUiTextBox()
						.id('textBox1')
						.value('')
						.placeHolder('Username')
						.placeHolderColor('#989898')
						.mount(main);
					
					new IgeUiTextBox()
						.id('textBox2')
						.value('')
						.mask('*')
						.placeHolder('Password')
						.placeHolderColor('#989898')
						.mount(main);
					
					new IgeUiButton()
						.id('button1')
						.value('Submit')
						.mount(main);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }