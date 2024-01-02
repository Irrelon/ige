"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const instance_1 = require("../../engine/instance.js");
const clientServer_1 = require("../../engine/clientServer.js");
require("./app/_route");
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
