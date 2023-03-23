import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { Star } from "./base/Star";
import { ige } from "@/engine/instance";
import { Resource } from "./Resource";
import { IgeScene2d } from "@/engine/core/IgeScene2d";

export class MiningBuilding extends Star {
	classId = "MiningBuilding";

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.depth(1);

		this._produces = produces;
		this._requires = requires;

		this.pointerUp(() => {
			new Resource(ResourceType.wood, this.id())
				.translateTo(this._translate.x, this._translate.y, 0)
				.mount(ige.$("scene1") as IgeScene2d);
		})
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(MiningBuilding);
