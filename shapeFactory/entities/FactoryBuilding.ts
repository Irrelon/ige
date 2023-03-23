import { Triangle } from "./base/Triangle";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";

export class FactoryBuilding extends Triangle {
	classId = "FactoryBuilding";

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.depth(1);

		this._produces = produces;
		this._requires = requires;
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(FactoryBuilding);
