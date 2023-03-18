import { IgeUiElement } from "../core/IgeUiElement";
export declare class IgeUiTogglePanel extends IgeUiElement {
    classId: string;
    constructor(title: any, titleTexture: any, toggleOffTexture: any, toggleOnTexture: any);
    toggleOn(method: any): this;
    toggleOff(method: any): this;
}
