import { GameEntity } from "./GameEntity";
import { registerClass } from "@/engine/igeClassStore";
import { Resource } from "../Resource";

export class Building extends GameEntity {
	transportQueue: Resource[] = [];

	constructor () {
		super();

		this.category("building");
	}

}

registerClass(Building);
