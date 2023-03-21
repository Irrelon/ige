import { ige } from "../engine/instance.js";
import { isClient, isServer } from "../engine/clientServer.js";
import "./app/_route.js";
export class Game {
    constructor() {
        this.classId = "Game";
        if (isClient) {
            ige.router.go("app/splash");
        }
        if (isServer) {
            ige.router.go("app/space");
        }
    }
}
if (isServer) {
    new Game();
}
