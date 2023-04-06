import { ige } from "../engine/instance.js";
import { isServer } from "../engine/clientServer.js";
import "./app/_route.js";
export class Game {
    constructor() {
        this.classId = "Game";
        ige.data("isometric", false);
        ige.router.go("app/level1");
    }
}
if (isServer) {
    new Game();
}
