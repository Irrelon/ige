"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
require("./app/_route");
const instance_1 = require("../../engine/instance.js");
class Game {
    constructor() {
        this.classId = "Game";
        instance_1.ige.router.go("app/splash");
    }
}
exports.Game = Game;
