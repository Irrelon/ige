import { ige } from "../engine/instance.js";
import { isServer } from "../engine/clientServer.js";
import "./app/_route.js";
export class Game {
    constructor(options) {
        this.classId = "Game";
        ige.router.go("app/level1");
    }
}
if (isServer) {
    new Game();
}
