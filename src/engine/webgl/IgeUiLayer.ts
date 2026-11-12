import { IgeEntity } from "@/engine/core/IgeEntity";

/**
 * A container for UI layer elements (see IgeEntity.uiLayer() and
 * guides/ui-layer.md): everything mounted under it with a texture is drawn
 * in its layer, over the scene, with its settings (uiScreenSize(),
 * uiOffset(), uiScreen()), unless it has its own. Mount it where its
 * elements should follow: in the scene for labels in the world, or anywhere
 * for screen elements (they place themselves in the viewport).
 * @example #Name tags in layer 1, every one 20 pixels tall
 *     const tags = new IgeUiLayer(1).uiScreenSize(20).mount(scene);
 *     new IgeUiTextLabel({ text: "Ann", layer: false }).translateTo(x, 120, z).mount(tags);
 */
export class IgeUiLayer extends IgeEntity {
	classId = "IgeUiLayer";

	constructor (layer: number = 0) {
		super();
		this.uiLayer(layer);
	}
}
