import { ige } from "@/engine/instance";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { Square } from "../../entities/base/Square";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { Triangle } from "../../entities/base/Triangle";
import { Flag } from "../../entities/base/Flag";
import { Star } from "../../entities/base/Star";
import { ResourceType } from "../../enums/ResourceType";
import { fillColorByResourceType } from "../../services/resource";

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

		const squareContainer = new IgeUiElement()
			.top(20)
			.mount(buildUi);

		new Square()
			.id("uiCreateStorage")
			.mount(squareContainer);

		const factoryContainer = new IgeUiElement()
			.top(90)
			.mount(buildUi);

		new Triangle()
			.id("uiCreateFactory")
			.mount(factoryContainer);

		const mineContainer1 = new IgeUiElement()
			.top(170)
			.mount(buildUi);

		new Star()
			.id("uiCreateMine1")
			.data("fillColor", fillColorByResourceType[ResourceType.wood])
			.mount(mineContainer1);

		const mineContainer2 = new IgeUiElement()
			.top(250)
			.mount(buildUi);

		new Star()
			.id("uiCreateMine2")
			.data("fillColor", fillColorByResourceType[ResourceType.grain])
			.mount(mineContainer2);

		const flagContainer = new IgeUiElement()
			.top(320)
			.mount(buildUi);

		new Flag()
			.id("uiCreateFlag")
			.mount(flagContainer);
	}

	removeGraph () {
		ige.$("uiScene")?.destroy();
	}
}
