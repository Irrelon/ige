import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import "./app/_route";
export class Game {
    constructor() {
        this.classId = "Game";
        ige.data("isometric", true);
        ige.engine.globalSmoothing(true);
        ige.router.go("app/level1");
    }
}
if (isServer) {
    new Game();
}
