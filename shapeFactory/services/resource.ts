import { ResourceType } from "../enums/ResourceType";

export const fillColorByResourceType: Record<ResourceType, string> = {
	[ResourceType.none]: "#000000",
	[ResourceType.wood]: "#006901",
	[ResourceType.grain]: "#ff00ea",
	[ResourceType.energy]: "#ff9900"
};
