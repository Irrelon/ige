import type { IgeTexture } from "../core/IgeTexture.js"
import { IgeUiElement } from "../core/IgeUiElement.js"
export declare class IgeUiTogglePanel extends IgeUiElement {
    classId: string;
    private _toggleState;
    private _toggleOffTexture;
    private _toggleOnTexture;
    private _panelImage;
    private _panelTitle;
    private _toggleOn?;
    private _toggleOff?;
    constructor(title: string, titleTexture: IgeTexture, toggleOffTexture: IgeTexture, toggleOnTexture: IgeTexture);
    toggleOn(method: () => void): this;
    toggleOff(method: () => void): this;
}
