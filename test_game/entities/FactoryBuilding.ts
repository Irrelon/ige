import { Resource } from "./Resource";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "../../engine/services/igeClassStore";
import { Circle } from "./base/Circle";

export class FactoryBuilding extends Circle {
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

registerClass(FactoryBuilding);