import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { registerClass } from "@/engine/igeClassStore";
import { isClient } from "@/engine/clientServer";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { Building } from "./base/Building";
import { ige } from "@/engine/instance";
import { IgeObject } from "@/engine/core/IgeObject";
import { IgePoint2d } from "@/engine/core/IgePoint2d";

export class FactoryBuilding2 extends Building {
	classId = "FactoryBuilding2";
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
		this.isometric(true);
		this.width(132);
		this.height(160);
		this.bounds3d(70,80,70);

		if (isClient) {
			new UiRequiresProducesDisplay(produces, requires).mount(this);
			this.texture(ige.textures.get("factory2"));
			this._textureOffset = new IgePoint2d(16, -10);
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

registerClass(FactoryBuilding2);
