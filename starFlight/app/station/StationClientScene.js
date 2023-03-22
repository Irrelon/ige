"use strict";
const appCore = require('../../../ige');
appCore.module('StationClientScene', function (ige, $game, $textures, IgeEventingClass, IgeScene2d, IgeEntity, IgeUiEntity) {
    const StationClientScene = IgeEventingClass.extend({
        classId: 'StationClientScene',
        init: function () {
        },
        addGraph: function (options) {
            // Set the viewport camera to 0, 0, 0
            ige.game.scene.vp1.camera
                .velocity.x(0)
                .velocity.y(0)
                .translateTo(0, 0, 0);
            ige.game.scene.sceneBase = new IgeScene2d()
                .id('sceneBase')
                .mount(ige.game.scene.mainScene);
            ige.game.scene.backScene = new IgeScene2d()
                .id('backScene')
                .layer(0)
                .mount(ige.game.scene.sceneBase);
            ige.game.scene.frontScene = new IgeScene2d()
                .id('frontScene')
                .layer(1)
                .mount(ige.game.scene.sceneBase);
            ige.game.scene.uiScene = new IgeScene2d()
                .id('uiScene')
                .layer(2)
                .ignoreCamera(true)
                .mount(ige.game.scene.sceneBase);
            // Create nebula
            ige.game.scene.nebula = new IgeEntity()
                .id('nebula')
                .layer(0)
                .texture(ige.textures.get('nebula'))
                .width(1600)
                .height(1600)
                .translateTo(0, 0, 0)
                .mount(ige.game.scene.backScene);
            // Create starfield
            ige.game.scene.starfield = new IgeEntity()
                .id('starfield')
                .layer(1)
                .texture(ige.textures.get('starfield'))
                .width(1600)
                .height(1600)
                .translateTo(0, 0, 0)
                .mount(ige.game.scene.backScene);
            ige.game.scene.windowStats = new IgeUiEntity()
                .id('windowStats')
                .texture(ige.textures.get('windowStats'))
                .dimensionsFromTexture()
                .top(-20)
                .right(-20)
                .mount(ige.game.scene.uiScene);
            ige.game.scene.radar = new IgeUiEntity()
                .id('radar')
                .layer(1)
                .texture(ige.textures.get('radar'))
                .width(330)
                .height(170)
                .bottom(13)
                .right(13)
                .mount(ige.game.scene.uiScene);
            ige.game.scene.windowLocalScan = new IgeUiEntity()
                .id('windowLocalScan')
                .layer(0)
                .texture(ige.textures.get('windowLocalScan'))
                .dimensionsFromTexture()
                .bottom(-20)
                .right(-20)
                .mount(ige.game.scene.uiScene);
            ige.game.scene.windowControls = new IgeUiEntity()
                .id('windowControls')
                .layer(2)
                .texture(ige.textures.get('windowControls'))
                .dimensionsFromTexture()
                .left(-20)
                .top(-20)
                .mount(ige.game.scene.uiScene);
        },
        removeGraph: function () {
            let i;
            if (ige.$('sceneBase')) {
                ige.$('sceneBase').destroy();
                // Clear any references
                for (i in ige.game.scene) {
                    if (ige.game.scene.hasOwnProperty(i)) {
                        if (!ige.game.scene[i].alive()) {
                            delete ige.game.scene[i];
                        }
                    }
                }
            }
        }
    });
    return StationClientScene;
});
