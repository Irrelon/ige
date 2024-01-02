"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
require("./app/_route");
const clientServer_1 = require("../../engine/clientServer.js");
const instance_1 = require("../../engine/instance.js");
class Game {
    constructor() {
        this.classId = "Game";
        instance_1.ige.data("isometric", true);
        instance_1.ige.engine.globalSmoothing(true);
        instance_1.ige.router.go("app/level1");
    }
}
exports.Game = Game;
if (clientServer_1.isServer) {
    new Game();
}
