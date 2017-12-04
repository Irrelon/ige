var appCore = require('../../../../index');

appCore.module('SplashClientScene', function ($ige, $game, $textures, IgeEventingClass, IgeScene2d, IgeEntity, IgeUiEntity, IgeUiElement, IgeUiWindow, IgeUiLabel, IgeUiDropDown, IgeVelocityComponent, IgeViewport, IgeUiButton, IgeAudioEntity) {
	var moduleSelf = this;
	
	var SplashClientScene = IgeEventingClass.extend({
		classId: 'SplashClientScene',
		
		init: function () {
		},
		
		addGraph: function (options) {
			$game.scene.sceneBase = new IgeScene2d()
				.id('sceneBase')
				.mount($game.scene.mainScene);
			
			$game.scene.backScene = new IgeScene2d()
				.id('backScene')
				.layer(0)
				.mount($game.scene.sceneBase);
			
			$game.scene.uiScene = new IgeScene2d()
				.id('uiScene')
				.layer(1)
				.ignoreCamera(true)
				.mount($game.scene.sceneBase);
			
			// Create an entity and mount it to the scene
			$game.scene.obj[0] = new Rotator(0.1)
				.id('fairy1')
				.depth(1)
				.width(100)
				.height(100)
				.texture($textures.get('fairy'))
				.translateTo(0, 0, 0)
				.mount($ige.engine.$('baseScene'));
			
			// Create a second rotator entity and mount
			// it to the first one at 0, 50 relative to the
			// parent
			$game.scene.obj[1] = new Rotator(0.1)
				.id('fairy2')
				.depth(1)
				.width(50)
				.height(50)
				.texture($textures.get('fairy'))
				.translateTo(0, 50, 0)
				.mount($game.scene.obj[0]);
			
			// Create a third rotator entity and mount
			// it to the first on at 0, -50 relative to the
			// parent, but assign it a smart texture!
			$game.scene.obj[2] = new Rotator(0.1)
				.id('simpleBox')
				.depth(1)
				.width(50)
				.height(50)
				.texture($textures.get('simpleBox'))
				.translateTo(0, -50, 0)
				.mount($game.scene.obj[0]);
			
			
			
			$game.scene.helloButton = new IgeUiButton()
				.id('helloButton')
				.texture($textures.get('button'))
				.width(120)
				.height(40)
				.middle(-100)
				.data('ui', {
					border: '#ffffff',
					text: {
						value: 'HELLO'
					}
				})
				.mount($game.scene.uiScene);
			
			$game.scene.helloButton._mouseOver = function () {
				var ui = this.data('ui');
				ui.fill = {
					color: 'rgba(0, 174, 255, 0.2)'
				};
			};
			$game.scene.helloButton._mouseOut = function () {
				var ui = this.data('ui');
				delete ui.fill;
			};
			$game.scene.helloButton._mouseUp = function () {
				moduleSelf.$controller.hello();
			};
			
			$game.scene.fullscreenButton = new IgeUiButton()
				.id('fullscreen')
				.texture($textures.get('button'))
				.width(100)
				.height(30)
				.right(10)
				.top(10)
				.data('ui', {
					border: '#ffffff',
					text: {
						value: 'FULLSCREEN'
					}
				})
				.mount($game.scene.uiScene);
			
			$game.scene.fullscreenButton._mouseOver = function () {
				var ui = this.data('ui');
				ui.fill = {
					color: 'rgba(0, 174, 255, 0.2)'
				};
			};
			
			$game.scene.fullscreenButton._mouseOut = function () {
				var ui = this.data('ui');
				delete ui.fill;
			};
			
			$game.scene.fullscreenButton._mouseUp = function () {
				moduleSelf.$controller.fullscreen();
			};
		},
		
		removeGraph: function () {
			var i;
			
			if ($ige.engine.$('sceneBase')) {
				$ige.engine.$('sceneBase').destroy();
				
				// Clear any references
				for (i in $game.scene) {
					if ($game.scene.hasOwnProperty(i)) {
						if (!$game.scene[i].alive()) {
							delete $game.scene[i];
						}
					}
					
				}
			}
		}
	});
	
	return SplashClientScene;
});