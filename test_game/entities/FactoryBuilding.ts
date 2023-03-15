import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "../../engine/services/igeClassStore";
import { Star } from "./base/Star";

export class FactoryBuilding extends Star {
	classId = "FactoryBuilding";
	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();
		
		this._produces = produces;
		this._requires = requires;
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(FactoryBuilding);
