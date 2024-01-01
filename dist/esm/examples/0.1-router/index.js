import { ige } from "../../engine/instance.js"
import "./app/_route";
export class Game {
    classId = "Game";
    constructor() {
        ige.router.go("app/splash");
    }
}
