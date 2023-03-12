import IgeEntity from "../../../engine/core/IgeEntity";
import { IgeStreamMode } from "../../../enums/IgeStreamMode";
import { registerClass } from "../../../engine/services/igeClassStore";

export class GameEntity extends IgeEntity {
	constructor () {
		super();

		this.streamMode(IgeStreamMode.simple)
	}
}

registerClass(GameEntity);