import { GameEntity } from "./GameEntity";
import { registerClass } from "@/engine/igeClassStore";
import { Resource } from "../Resource";

export class Building extends GameEntity {
	transportQueue: Resource[] = [];
}

registerClass(Building);
