import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { Star } from "./base/Star";
import { ige } from "@/engine/instance";
import { Resource } from "./Resource";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { isServer } from "@/engine/clientServer";
import { IgeInterval } from "@/engine/core/IgeInterval";

export class FactoryBuilding extends Star {
	classId = "FactoryBuilding";
	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];

	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.depth(1);

		this._produces = produces;
		this._requires = requires;

		if (isServer) {
			const destinations = ["base1", "resourceBuilding1", "factoryBuilding1", "factoryBuilding2"]
			new IgeInterval(() => {
				const r = Math.floor(Math.random() * 4);
				const destinationId = destinations[r];

				new Resource(ResourceType.wood, this.id(), destinationId)
					.translateTo(this._translate.x, this._translate.y, 0)
					.mount(ige.$("scene1") as IgeScene2d);
			}, Math.random() * 12000 + 5000);
		}

		this.pointerUp(() => {
			new Resource(ResourceType.wood, this.id(), "base1")
				.translateTo(this._translate.x, this._translate.y, 0)
				.mount(ige.$("scene1") as IgeScene2d);
		})
	}

	streamCreateConstructorArgs () {
		return [this._produces, this._requires];
	}
}

registerClass(FactoryBuilding);
