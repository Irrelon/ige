"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
require("./app/_route");
const clientServer_1 = require("../../engine/clientServer.js");
const instance_1 = require("../../engine/instance.js");
class Game {
    constructor() {
        this.classId = "Game";
        instance_1.ige.app = {};
        if (clientServer_1.isClient) {
            instance_1.ige.router.go("app/splash");
        }
        if (clientServer_1.isServer) {
            instance_1.ige.router.go("app/space");
        }
    }
}
exports.Game = Game;
if (clientServer_1.isServer) {
    new Game();
}
