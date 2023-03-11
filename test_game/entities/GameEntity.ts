import IgeEntity from "../../engine/core/IgeEntity";
import { IgeStreamMode } from "../../enums/IgeStreamMode";

export class GameEntity extends IgeEntity {
	constructor () {
		super();

		this.streamMode(IgeStreamMode.simple)
	}
}