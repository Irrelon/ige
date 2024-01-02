"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageBuilding = void 0;
const igeClassStore_1 = require("../../../engine/igeClassStore.js");
const instance_1 = require("../../../engine/instance.js");
const Building_1 = require("./base/Building");
const ResourceType_1 = require("../enums/ResourceType");
const Resource_1 = require("./Resource");
const clientServer_1 = require("../../../engine/clientServer.js");
const IgePoint2d_1 = require("../../../engine/core/IgePoint2d.js");
class StorageBuilding extends Building_1.Building {
	constructor(tileX = NaN, tileY = NaN) {
		super();
		this.classId = "StorageBuilding";
		this.tileXDelta = -1;
		this.tileYDelta = -1;
		this.tileW = 3;
		this.tileH = 3;
		this.tileX = tileX;
		this.tileY = tileY;
		this.layer(10);
		this.isometric(instance_1.ige.data("isometric"));
		this.width(180);
		this.height(180);
		this.bounds3d(110, 110, 65);
		this.originTo(0.5, 0.45, 0.5);
		if (clientServer_1.isClient) {
			this.texture(instance_1.ige.textures.get("headquarters"));
			this._textureOffset = new IgePoint2d_1.IgePoint2d(6, -14);
		}
	}
	streamCreateConstructorArgs() {
		return [this.tileX, this.tileY];
	}
	/**
	 * Takes a resource from the resource pool and dumps it back onto the
	 * map for it to decide where to route itself.
	 */
	dispenseResource(type) {
		this._subtractResource(this.resourcePool, type, 1);
		// Generate our new resource
		new Resource_1.Resource(type, this.id())
			.translateTo(this._translate.x, this._translate.y, 0)
			.mount(instance_1.ige.$("tileMap1"));
	}
	_updateOnServer() {
		// Because we are a storage building, check if we should dispense
		// any existing resources if buildings need them
		// Check buildings to see if any need this resource at the moment
		const buildings = instance_1.ige.$$("building");
		// If we have no buildings to scan, return, since destination will be the base
		if (!buildings.length) return;
		// TODO: Filter so we don't take other storage buildings into account
		// Loop our resources and see if any buildings need it
		Object.entries(this.resourcePool).forEach(([type, count]) => {
			if (!count) return;
			if (type === ResourceType_1.ResourceType.none) return;
			// Scan each building and ask if it needs this resource and if so, determine the closest one
			const someBuildingNeedsThisResource = buildings.find((tmpBuilding) => {
				return tmpBuilding.needsResource(type);
			});
			if (someBuildingNeedsThisResource) {
				this.dispenseResource(type);
			}
		});
		super._updateOnServer();
	}
	_mounted(obj) {
		super._mounted(obj);
		if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
			this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
		}
	}
}
exports.StorageBuilding = StorageBuilding;
(0, igeClassStore_1.registerClass)(StorageBuilding);
