"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const instance_1 = require("../../engine/instance.js");
require("./app/_route");
class Game {
	constructor() {
		this.classId = "Game";
		instance_1.ige.router.go("app/splash");
	}
}
exports.Game = Game;
