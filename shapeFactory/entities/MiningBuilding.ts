import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { Star } from "./base/Star";

export class MiningBuilding extends Star {
	classId = "MiningBuilding";

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this._produces = produces;
		this._requires = requires;

		this.layer(10);
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(MiningBuilding);
