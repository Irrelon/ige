import { IgeEntity } from "../../../engine/core/IgeEntity.js";
import { IgeStreamMode } from "../../../enums/IgeStreamMode.js";
import { registerClass } from "../../../engine/igeClassStore.js";
export class GameEntity extends IgeEntity {
    constructor() {
        super();
        this.streamMode(IgeStreamMode.simple);
    }
}
registerClass(GameEntity);
