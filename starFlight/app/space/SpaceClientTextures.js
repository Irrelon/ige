"use strict";
var appCore = require('../../../ige');
require('../../assets/backgrounds/nebulaFieldSmartTexture');
require('../../assets/backgrounds/starFieldSmartTexture');
require('../../assets/ui/radarSmartTexture');
appCore.module('SpaceClientTextures', function (ige, $textures, IgeTexture, IgeCellSheet, nebulaFieldSmartTexture, starFieldSmartTexture, radarSmartTexture) {
    var textures = {};
    // UI
    textures.title = new IgeTexture('assets/ui/title.png');
    textures.button = new IgeTexture('assets/ui/igeButton.js');
    textures.irrelon = new IgeTexture('assets/ui/irrelon.png');
    textures.windowLocalScan = new IgeTexture('assets/ui/windowLocalScan3.png');
    textures.windowStats = new IgeTexture('assets/ui/windowStats2.png');
    textures.windowControls = new IgeTexture('assets/ui/windowControls5.png');
    textures.windowTargetData = new IgeTexture('assets/ui/windowTargetData.png');
    // Game
    textures.ship1 = new IgeTexture('assets/sprites/ship1.png');
    textures.asteroid1 = new IgeTexture('assets/sprites/asteroid1.png');
    textures.asteroid2 = new IgeTexture('assets/sprites/asteroid2.png');
    textures.asteroid3 = new IgeTexture('assets/sprites/asteroid3.png');
    textures.asteroid4 = new IgeTexture('assets/sprites/asteroid4.png');
    textures.asteroid5 = new IgeTexture('assets/sprites/asteroid5.png');
    textures.asteroid6 = new IgeTexture('assets/sprites/asteroid6.png');
    textures.asteroid7 = new IgeTexture('assets/sprites/asteroid7.png');
    textures.asteroid8 = new IgeTexture('assets/sprites/asteroid8.png');
    textures.spaceStation1 = new IgeTexture('assets/sprites/spaceStation1.png');
    textures.starfield = new IgeTexture(starFieldSmartTexture);
    textures.neb1 = new IgeTexture('assets/backgrounds/neb1.png');
    textures.neb2 = new IgeTexture('assets/backgrounds/neb2.png');
    textures.neb3 = new IgeTexture('assets/backgrounds/neb3.png');
    textures.neb4 = new IgeTexture('assets/backgrounds/neb4.png');
    textures.nebula = new IgeTexture(nebulaFieldSmartTexture);
    textures.radar = new IgeTexture(radarSmartTexture);
    textures.target = new IgeTexture('assets/ui/target.js');
    textures.laser1 = new IgeTexture('assets/sprites/laser1.js');
    textures.explosions1 = new IgeCellSheet('assets/sprites/explosions.png', 8, 22);
    textures.ore1 = new IgeCellSheet('assets/sprites/ore1.png', 8, 2);
    textures.jumpGate1 = new IgeTexture('assets/sprites/jumpGate1.png');
    textures.jumpGate2 = new IgeTexture('assets/sprites/jumpGate2.png');
    textures.abilityButton = new IgeTexture('assets/ui/abilityButton.png');
    $textures.addGroup(textures);
    this.on('destroy', function () {
        $textures.removeGroup(textures);
    });
});
