import { ige } from "@/engine/instance";
import "./app/_route";
export class Game {
    constructor() {
        this.classId = "Game";
        ige.router.go("app/splash");
    }
}
