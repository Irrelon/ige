import { GameEntity } from "./GameEntity.js";
import { registerClass } from "../../../engine/igeClassStore.js";
export class Building extends GameEntity {
    constructor() {
        super();
        this.transportQueue = [];
        this.category("building");
    }
}
registerClass(Building);
