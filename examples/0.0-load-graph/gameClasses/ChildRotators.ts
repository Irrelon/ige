import { ige } from "../../../engine/instance";
import { Rotator } from "./Rotator";
import IgeEntity from "../../../engine/core/IgeEntity";
import { Client } from "../client";

export const createChildRotators = (parent: IgeEntity, distance = 120, speed = 0.1) => {
	const client = ige.client as Client;

	const entity1 = new Rotator(speed)
		.depth(1)
		.width(50)
		.height(50)
		.texture(client.gameTexture.simpleBox)
		.scaleTo(0.5, 0.5, 0.5)
		.translateTo(0, distance, 0)
		.mount(parent);

	const entity2 = new Rotator(speed)
		.depth(1)
		.width(50)
		.height(50)
		.texture(client.gameTexture.simpleBox)
		.scaleTo(0.5, 0.5, 0.5)
		.translateTo(0, -distance, 0)
		.mount(parent);

	const entity3 = new Rotator(speed)
		.depth(1)
		.width(50)
		.height(50)
		.texture(client.gameTexture.simpleBox)
		.scaleTo(0.5, 0.5, 0.5)
		.translateTo(-distance, 0, 0)
		.mount(parent);

	const entity4 = new Rotator(speed)
		.depth(1)
		.width(50)
		.height(50)
		.texture(client.gameTexture.simpleBox)
		.scaleTo(0.5, 0.5, 0.5)
		.translateTo(distance, 0, 0)
		.mount(parent);

	return [entity1, entity2, entity3, entity4];
};
