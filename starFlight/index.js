import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/clientServer";
import "./app/_route";
export class Game {
    constructor() {
        this.classId = "Game";
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
