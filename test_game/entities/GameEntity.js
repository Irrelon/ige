import IgeEntity from "../../engine/core/IgeEntity.js";
import { IgeStreamMode } from "../../enums/IgeStreamMode.js";
export class GameEntity extends IgeEntity {
    constructor() {
        super();
        this.streamMode(IgeStreamMode.simple);
    }
}
