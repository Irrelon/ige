import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { ige } from "@/engine/instance";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";

export class UiRequiresProducesDisplay extends IgeUiElement {
	constructor (produces: ResourceType, requires: BuildingResourceRequirement[] = []) {
		super();

		this.drawBounds(false)
			.width(200)
			.height(20)
			.translateBy(0, -50, 0)
			.scaleTo(0.8, 0.8, 0.8);

		requires.forEach((requiresItem, index) => {
			new IgeUiElement()
				.texture(ige.textures.get(requiresItem.type))
				.center((-20 * (index + 1) - 10))
				.width(20)
				.height(20)
				.mount(this);
		});

		if (produces !== ResourceType.none) {
			new IgeUiElement()
				.texture(ige.textures.get("arrow"))
				.width(20)
				.height(15)
				.mount(this);

			new IgeUiElement()
				.texture(ige.textures.get(produces))
				.center(30)
				.width(20)
				.height(20)
				.mount(this);
		}
	}
}
