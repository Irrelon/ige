"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grid = void 0;
const IgeEntity_1 = require("../../../engine/core/IgeEntity.js");
const instance_1 = require("../../../engine/instance.js");
const clientServer_1 = require("../../../engine/clientServer.js");
class Grid extends IgeEntity_1.IgeEntity {
	constructor() {
		super();
		this.classId = "Grid";
		this.spacing = 100;
		this.width(1000);
		this.height(1000);
		if (clientServer_1.isClient) {
			this.texture(instance_1.ige.textures.get("gridSmartTexture"));
		}
	}
}
exports.Grid = Grid;
