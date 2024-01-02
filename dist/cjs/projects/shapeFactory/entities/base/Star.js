"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Star = void 0;
const instance_1 = require("../../../../engine/instance.js");
const clientServer_1 = require("../../../../engine/clientServer.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const Building_1 = require("./Building");
class Star extends Building_1.Building {
	constructor() {
		super();
		this.classId = "Star";
		this.data("glowColor", "#00ff00").layer(1).width(60).height(60);
		if (clientServer_1.isClient) {
			this.texture(instance_1.ige.textures.get("starSmartTexture"));
			this.registerNetworkClass();
		}
	}
}
exports.Star = Star;
(0, igeClassStore_1.registerClass)(Star);
