import { Triangle } from "./base/Triangle";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "../../engine/services/igeClassStore";

export class ResourceBuilding extends Triangle {
	classId = "ResourceBuilding";
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

registerClass(ResourceBuilding);
