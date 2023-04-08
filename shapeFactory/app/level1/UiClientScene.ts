import { ige } from "@/engine/instance";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { ResourceType } from "../../enums/ResourceType";
import { fillColorByResourceType } from "../../services/resource";
import { UiBuildItem } from "../../entities/base/UiBuildItem";

export class UiClientScene extends IgeSceneGraph {
	async addGraph () {
		const baseScene = ige.$("baseScene") as IgeScene2d;

		const uiScene = new IgeScene2d()
			.id("uiScene")
			.layer(1)
			.ignoreCamera(true)
			.mount(baseScene);

		const buildUi = new IgeUiElement()
			.left(0)
			.middle(0)
			.width(80)
			.height(400)
			.borderWidth(1)
			.borderColor("#ffffff")
			.backgroundColor("#222222")
			.mount(uiScene);

		new UiBuildItem(ige.textures.get("squareSmartTexture"), "Storage")
			.id("uiCreateStorage")
			.top(20)
			.mount(buildUi);

		new UiBuildItem(ige.textures.get("triangleSmartTexture"), "Energy Factory")
			.id("uiCreateFactory")
			.top(90)
			.mount(buildUi);

		new UiBuildItem(ige.textures.get("starSmartTexture"), "Green Mine")
			.id("uiCreateMine1")
			.data("fillColor", fillColorByResourceType[ResourceType.wood])
			.top(170)
			.mount(buildUi);

		new UiBuildItem(ige.textures.get("starSmartTexture"), "Purple Mine")
			.id("uiCreateMine2")
			.data("fillColor", fillColorByResourceType[ResourceType.stone])
			.top(250)
			.mount(buildUi);

		new UiBuildItem(ige.textures.get("flagSmartTexture"), "Flag")
			.id("uiCreateFlag")
			.top(320)
			.mount(buildUi);
	}

	removeGraph () {
		ige.$("uiScene")?.destroy();
	}
}
