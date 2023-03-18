import { GameEntity } from "./GameEntity";
import { registerClass } from "../../../engine/services/igeClassStore";
export class Building extends GameEntity {
    constructor() {
        super(...arguments);
        this.transportQueue = [];
    }
}
registerClass(Building);
