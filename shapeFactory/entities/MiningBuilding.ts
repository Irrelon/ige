import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { isClient } from "@/engine/clientServer";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { ige } from "@/engine/instance";
import { IgeObject } from "@/engine/core/IgeObject";
import { Building } from "./base/Building";

export class MiningBuilding extends Building {
	classId = "MiningBuilding";

	constructor (tileX: number = NaN, tileY: number = NaN, produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.tileX = tileX;
		this.tileY = tileY;
		this._produces = produces;
		this._requires = requires;

		this.layer(10);
		this.isometric(ige.data("isometric"));
		this.width(80);
		this.height(100);
		this.bounds3d(40,40,50);

		if (isClient) {
			new UiRequiresProducesDisplay(produces, requires).mount(this);
			this.texture(ige.textures.get("mine"));
		}
	}

	streamCreateConstructorArgs () {
		return [this.tileX, this.tileY, this._produces, this._requires];
	}

	_mounted (obj: IgeObject) {
		super._mounted(obj);

		if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
			this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
		}
	}
}

registerClass(MiningBuilding);
