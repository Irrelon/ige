import { ige } from "@/engine/instance";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { Square } from "../../entities/base/Square";
import { IgeUiElement } from "@/engine/core/IgeUiElement";

export class UiClientScene extends IgeSceneGraph {
	async addGraph () {
		const baseScene = ige.$("baseScene") as IgeScene2d;

		const uiScene = new IgeScene2d()
			.layer(1)
			.ignoreCamera(true)
			.mount(baseScene)

		const buildUi = new IgeUiElement()
			.left(0)
			.middle(0)
			.width(80)
			.height(400)
			.borderWidth(1)
			.borderColor("#ffffff")
			.backgroundColor("#222222")
			.mount(uiScene);

		const storage = new Square()
			.mount(buildUi);
	}

	removeGraph () {

	}
}