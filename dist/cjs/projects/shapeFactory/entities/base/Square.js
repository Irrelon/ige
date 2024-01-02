"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Square = void 0;
const instance_1 = require("../../../../engine/instance.js");
const clientServer_1 = require("../../../../engine/clientServer.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const Building_1 = require("./Building");
class Square extends Building_1.Building {
	constructor() {
		super();
		this.classId = "Square";
		this.data("glowColor", "#00d0ff").layer(1).width(50).height(50);
		if (clientServer_1.isClient) {
			this.texture(instance_1.ige.textures.get("squareSmartTexture"));
			this.registerNetworkClass();
		}
	}
}
exports.Square = Square;
(0, igeClassStore_1.registerClass)(Square);
