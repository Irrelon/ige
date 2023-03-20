"use strict";
var appCore = require('../../../ige'), galaxyData;
require('../component/JumpGate');
galaxyData = require('../data/galaxy.json');
appCore.module('StationServerScene', function (ige, $ige, $game, $textures, IgeEventingClass, IgeScene2d) {
    var moduleSelf = this;
    var StationServerScene = IgeEventingClass.extend({
        classId: 'StationServerScene',
        init: function () {
        },
        addGraph: function (options) {
            var systemData, station, jumpGate, i;
            if ($ige.isServer) {
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
                // Read the galaxy data for this system
                systemData = galaxyData.system[moduleSelf.$controller._systemId];
                // Create stations
                if (systemData.station) {
                    for (i = 0; i < systemData.station.length; i++) {
                        station = systemData.station[i];
                        new StationStation()
                            .id(station._id)
                            .translateTo(station.position[0], station.position[1], station.position[2])
                            .streamMode(1)
                            .mount($game.scene.frontScene);
                    }
                }
                // Create jump gates
                if (systemData.jumpGate) {
                    for (i = 0; i < systemData.jumpGate.length; i++) {
                        jumpGate = systemData.jumpGate[i];
                        new JumpGate()
                            .id(jumpGate._id)
                            .translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
                            .streamMode(1)
                            .mount($game.scene.frontScene);
                    }
                }
                /*self.generateAsteroidBelt(800, 0);*/
            }
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
    return StationServerScene;
});
