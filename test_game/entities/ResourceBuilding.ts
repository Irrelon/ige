import { Triangle } from "./base/Triangle";
import { Resource } from "./Resource";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "../../engine/services/igeClassStore";

export class ResourceBuilding extends Triangle {
	classId = "ResourceBuilding";
	transportQueue: Resource[] = [];
	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();
		
		this._produces = produces;
		this._requires = requires;
	}

	streamCreateData () {
		return [this._produces, this._requires];
	}
}

registerClass(ResourceBuilding);