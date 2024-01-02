import type { IgeTexture } from "../../../../engine/core/IgeTexture.js"
import { IgeUiElement } from "../../../../engine/core/IgeUiElement.js"
import { IgeUiLabel } from "../../../../engine/ui/IgeUiLabel.js"
export declare class UiBuildItem extends IgeUiElement {
    labelEntity: IgeUiLabel;
    constructor(icon: IgeTexture, label: string);
}
