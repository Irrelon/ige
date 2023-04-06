import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
export declare class UiBuildItem extends IgeUiElement {
    labelEntity: IgeUiLabel;
    constructor(icon: IgeTexture, label: string);
}