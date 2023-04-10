import { registerClass } from "@/engine/igeClassStore";
import { Square } from "./base/Square";
import { ige } from "@/engine/instance";
import { Building } from "./base/Building";
import { ResourceType } from "../enums/ResourceType";
import { Resource } from "./Resource";
import { isClient } from "@/engine/clientServer";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeObject } from "@/engine/core/IgeObject";
import { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";

export class StorageBuilding extends Square {
	classId = "StorageBuilding";
	tileXDelta = -1;
	tileYDelta = -1;
	tileW = 3;
	tileH = 3;

	constructor (tileX: number = NaN, tileY: number = NaN) {
		super();
		this.tileX = tileX;
		this.tileY = tileY;

		this.layer(10);
		this.isometric(true);
		this.width(180);
		this.height(180);
		this.bounds3d(110,110,65);
		this.originTo(0.5, 0.45, 0.5);

		if (isClient) {
			this.texture(ige.textures.get("headquarters"));
			this._textureOffset = new IgePoint2d(0, -14);
		}
	}

	streamCreateConstructorArgs () {
		return [this.tileX, this.tileY];
	}

	/**
	 * Takes a resource from the resource pool and dumps it back onto the
	 * map for it to decide where to route itself.
	 */
	dispenseResource (type: ResourceType) {
		this._subtractResource(this.resourcePool, type, 1);

		// Generate our new resource
		new Resource(type, this.id())
			.translateTo(this._translate.x, this._translate.y, 0)
			.mount(ige.$("tileMap1") as IgeTileMap2d);
	}

	_updateOnServer () {
		// Because we are a storage building, check if we should dispense
		// any existing resources if buildings need them
		// Check buildings to see if any need this resource at the moment
		const buildings = ige.$$("building") as Building[];

		// If we have no buildings to scan, return, since destination will be the base
		if (!buildings.length) return;

		// TODO: Filter so we don't take other storage buildings into account

		// Loop our resources and see if any buildings need it
		Object.entries(this.resourcePool).forEach(([type, count]) => {
			if (!count) return;
			if (type === ResourceType.none) return;

			// Scan each building and ask if it needs this resource and if so, determine the closest one
			const someBuildingNeedsThisResource = buildings.find((tmpBuilding) => {
				return tmpBuilding.needsResource(type as ResourceType);
			});

			if (someBuildingNeedsThisResource) {
				this.dispenseResource(type as ResourceType);
			}
		});

		super._updateOnServer();
	}

	_mounted (obj: IgeObject) {
		super._mounted(obj);

		if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
			this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
		}
	}
}

registerClass(StorageBuilding);
