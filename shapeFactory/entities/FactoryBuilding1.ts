import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { isClient } from "@/engine/clientServer";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { Building } from "./base/Building";
import { ige } from "@/engine/instance";
import { IgeObject } from "@/engine/core/IgeObject";
import { IgePoint2d } from "@/engine/core/IgePoint2d";

export class FactoryBuilding1 extends Building {
	classId = "FactoryBuilding1";
	tileXDelta = -1;
	tileYDelta = -1;
	tileW = 3;
	tileH = 3;

	constructor (tileX: number = NaN, tileY: number = NaN, produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.tileX = tileX;
		this.tileY = tileY;
		this._produces = produces;
		this._requires = requires;

		this.layer(10);
		this.isometric(ige.data("isometric"));
		this.width(160);
		this.height(160);
		this.bounds3d(90,90,56);

		if (isClient) {
			new UiRequiresProducesDisplay(produces, requires).mount(this);
			this.texture(ige.textures.get("factory1"));
			this._textureOffset = new IgePoint2d(24, -16);
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

registerClass(FactoryBuilding1);
