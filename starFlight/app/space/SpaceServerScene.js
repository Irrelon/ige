"use strict";
var appCore = require('../../../ige'), galaxyData;
require('../component/JumpGate');
require('../component/Asteroid');
galaxyData = require('../data/galaxy.json');
appCore.module('SpaceServerScene', function (ige, $ige, $game, $textures, IgeEventingClass, IgeScene2d, SpaceStation, JumpGate, Asteroid) {
    var moduleSelf = this;
    var generateAsteroidBelt = function generateAsteroidBelt(beltX, beltY) {
        var maxDist = 900, minDist = 500, dist, x, y, i, count = 0, max = 100, asteroid, asteroidArr = [], rejectedLocation;
        while (count < max) {
            if (!asteroid) {
                asteroid = new Asteroid();
                asteroid.mount($game.scene.middleScene);
            }
            x = Math.floor(beltX + ((Math.random() * maxDist * 2) - maxDist));
            y = Math.floor(beltY + ((Math.random() * maxDist * 2) - maxDist));
            dist = Math.distance(x, y, beltX, beltY);
            if (dist > minDist && dist < maxDist) {
                asteroid.translateTo(x, y, 0);
                asteroid.updateTransform();
                rejectedLocation = false;
                // Make sure no asteroids intersect this one
                for (i = 0; i < asteroidArr.length; i++) {
                    if (asteroidArr[i].aabb().intersects(asteroid.aabb(true))) {
                        // The asteroid intersects another, reject this location
                        rejectedLocation = true;
                        break;
                    }
                }
                if (!rejectedLocation) {
                    asteroid.streamMode(1);
                    asteroidArr.push(asteroid);
                    asteroid = undefined;
                    count++;
                }
            }
        }
    };
    var SpaceServerScene = IgeEventingClass.extend({
        classId: 'SpaceServerScene',
        init: function () {
        },
        addGraph: function (options) {
            var systemData, station, jumpGate, asteroidBelt, i;
            if ($ige.isServer) {
                $game.scene.sceneBase = new IgeScene2d()
                    .id('sceneBase')
                    .mount($game.scene.mainScene);
                $game.scene.backScene = new IgeScene2d()
                    .id('backScene')
                    .layer(0)
                    .mount($game.scene.sceneBase);
                $game.scene.middleScene = new IgeScene2d()
                    .id('middleScene')
                    .layer(1)
                    .mount($game.scene.sceneBase);
                $game.scene.frontScene = new IgeScene2d()
                    .id('frontScene')
                    .layer(2)
                    .mount($game.scene.sceneBase);
                // Read the galaxy data for this system
                systemData = require('../data/system/' + moduleSelf.$controller._systemId);
                // Create stations
                if (systemData.station) {
                    for (i = 0; i < systemData.station.length; i++) {
                        station = systemData.station[i];
                        new SpaceStation(station.public)
                            .id(station._id)
                            .translateTo(station.position[0], station.position[1], station.position[2])
                            .streamMode(1)
                            .mount($game.scene.middleScene);
                    }
                }
                // Create jump gates
                if (systemData.jumpGate) {
                    for (i = 0; i < systemData.jumpGate.length; i++) {
                        jumpGate = systemData.jumpGate[i];
                        new JumpGate(jumpGate.public)
                            .id(jumpGate._id)
                            .translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
                            .streamMode(1)
                            .mount($game.scene.middleScene);
                    }
                }
                // Create jump gates
                if (systemData.asteroidBelt) {
                    for (i = 0; i < systemData.asteroidBelt.length; i++) {
                        asteroidBelt = systemData.asteroidBelt[i];
                        generateAsteroidBelt(asteroidBelt.position[0], asteroidBelt.position[1]);
                    }
                }
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
    return SpaceServerScene;
});
