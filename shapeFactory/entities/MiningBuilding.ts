import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { Star } from "./base/Star";
import { FlagBuilding } from "./FlagBuilding";

export class MiningBuilding extends Star {
	classId = "MiningBuilding";
	flag?: FlagBuilding;

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this._produces = produces;
		this._requires = requires;
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(MiningBuilding);
