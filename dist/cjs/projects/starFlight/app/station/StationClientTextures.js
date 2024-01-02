"use strict";
const appCore = require("../../../ige");
require("../../assets/backgrounds/nebulaFieldSmartTexture");
require("../../assets/backgrounds/starFieldSmartTexture");
require("../../assets/ui/radarSmartTexture");
appCore.module("StationClientTextures", function (ige, $textures, IgeTexture, IgeCellSheet, nebulaFieldSmartTexture, starFieldSmartTexture, radarSmartTexture) {
    const textures = {};
    // UI
    textures.title = new IgeTexture("assets/ui/title.png");
    textures.button = new IgeTexture("assets/ui/igeButton.js");
    textures.irrelon = new IgeTexture("assets/ui/irrelon.png");
    textures.windowLocalScan = new IgeTexture("assets/ui/windowLocalScan3.png");
    textures.windowStats = new IgeTexture("assets/ui/windowStats2.png");
    textures.windowControls = new IgeTexture("assets/ui/windowControls5.png");
    // Game
    textures.ship1 = new IgeTexture("assets/sprites/ship1.png");
    textures.asteroid1 = new IgeCellSheet("assets/sprites/asteroid1.png", 8, 4);
    textures.asteroid2 = new IgeCellSheet("assets/sprites/asteroid2.png", 5, 6);
    textures.spaceStation1 = new IgeTexture("assets/sprites/spaceStation1.png");
    textures.starfield = new IgeTexture(starFieldSmartTexture);
    textures.neb1 = new IgeTexture("assets/backgrounds/neb1.png");
    textures.neb2 = new IgeTexture("assets/backgrounds/neb2.png");
    textures.neb3 = new IgeTexture("assets/backgrounds/neb3.png");
    textures.neb4 = new IgeTexture("assets/backgrounds/neb4.png");
    textures.nebula = new IgeTexture(nebulaFieldSmartTexture);
    textures.radar = new IgeTexture(radarSmartTexture);
    textures.target = new IgeTexture("assets/ui/targetSmartTexture.js");
    textures.laser = new IgeTexture("assets/sprites/laser.js");
    textures.explosions1 = new IgeCellSheet("assets/sprites/explosions.png", 8, 22);
    textures.ore1 = new IgeCellSheet("assets/sprites/ore1.png", 8, 2);
    textures.jumpGate1 = new IgeTexture("assets/sprites/jumpGate1.png");
    ige.textures.addGroup(textures);
    this.on("destroy", function () {
        ige.textures.removeGroup(textures);
    });
});
