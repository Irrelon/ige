import "./app/_route";
import { isClient, isServer } from "../../engine/clientServer.js"
import { ige } from "../../engine/instance.js"
export class Game {
    classId = "Game";
    constructor() {
        ige.app = {};
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
