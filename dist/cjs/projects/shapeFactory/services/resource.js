"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillColorByResourceType = void 0;
const ResourceType_1 = require("../enums/ResourceType");
exports.fillColorByResourceType = {
	[ResourceType_1.ResourceType.none]: "#000000",
	[ResourceType_1.ResourceType.wood]: "#006901",
	[ResourceType_1.ResourceType.stone]: "#8a8a8a",
	[ResourceType_1.ResourceType.gold]: "#ff9900",
	[ResourceType_1.ResourceType.brick]: "#945400",
	[ResourceType_1.ResourceType.grain]: "#f8ffbe",
	[ResourceType_1.ResourceType.energy]: "#00a6ff",
	[ResourceType_1.ResourceType.elerium]: "#ae7eff",
	[ResourceType_1.ResourceType.diamond]: "#b3dfff",
	[ResourceType_1.ResourceType.science]: "#8400ff",
	[ResourceType_1.ResourceType.uranium]: "#00ff47"
};
