import { ige } from "../../engine/instance.js";
import "./app/_route.js";
export class Game {
    constructor() {
        this.classId = "Game";
        ige.router.go("app/splash");
    }
}
