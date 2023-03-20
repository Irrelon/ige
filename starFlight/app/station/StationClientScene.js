"use strict";
var appCore = require('../../../ige');
appCore.module('StationClientScene', function (ige, $game, $textures, IgeEventingClass, IgeScene2d, IgeEntity, IgeUiEntity) {
    var StationClientScene = IgeEventingClass.extend({
        classId: 'StationClientScene',
        init: function () {
        },
        addGraph: function (options) {
            // Set the viewport camera to 0, 0, 0
            $game.scene.vp1.camera
                .velocity.x(0)
                .velocity.y(0)
                .translateTo(0, 0, 0);
            $game.scene.sceneBase = new IgeScene2d()
                .id('sceneBase')
                .mount($game.scene.mainScene);
            $game.scene.backScene = new IgeScene2d()
                .id('backScene')
                .layer(0)
                .mount($game.scene.sceneBase);
            $game.scene.frontScene = new IgeScene2d()
                .id('frontScene')
                .layer(1)
                .mount($game.scene.sceneBase);
            $game.scene.uiScene = new IgeScene2d()
                .id('uiScene')
                .layer(2)
                .ignoreCamera(true)
                .mount($game.scene.sceneBase);
            // Create nebula
            $game.scene.nebula = new IgeEntity()
                .id('nebula')
                .layer(0)
                .texture($textures.get('nebula'))
                .width(1600)
                .height(1600)
                .translateTo(0, 0, 0)
                .mount($game.scene.backScene);
            // Create starfield
            $game.scene.starfield = new IgeEntity()
                .id('starfield')
                .layer(1)
                .texture($textures.get('starfield'))
                .width(1600)
                .height(1600)
                .translateTo(0, 0, 0)
                .mount($game.scene.backScene);
            $game.scene.windowStats = new IgeUiEntity()
                .id('windowStats')
                .texture($textures.get('windowStats'))
                .dimensionsFromTexture()
                .top(-20)
                .right(-20)
                .mount($game.scene.uiScene);
            $game.scene.radar = new IgeUiEntity()
                .id('radar')
                .layer(1)
                .texture($textures.get('radar'))
                .width(330)
                .height(170)
                .bottom(13)
                .right(13)
                .mount($game.scene.uiScene);
            $game.scene.windowLocalScan = new IgeUiEntity()
                .id('windowLocalScan')
                .layer(0)
                .texture($textures.get('windowLocalScan'))
                .dimensionsFromTexture()
                .bottom(-20)
                .right(-20)
                .mount($game.scene.uiScene);
            $game.scene.windowControls = new IgeUiEntity()
                .id('windowControls')
                .layer(2)
                .texture($textures.get('windowControls'))
                .dimensionsFromTexture()
                .left(-20)
                .top(-20)
                .mount($game.scene.uiScene);
        },
        removeGraph: function () {
            var i;
            if (ige.$('sceneBase')) {
                ige.$('sceneBase').destroy();
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
    return StationClientScene;
});
