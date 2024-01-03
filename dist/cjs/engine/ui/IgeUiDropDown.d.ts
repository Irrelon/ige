import { IgeUiElement } from "../../export/exports.js"
import { IgeUiLabel } from "../../export/exports.js"
import type { IgeCanvasRenderingContext2d } from "../../export/exports.js"
export interface IgeUiDropDownOption {
    text: string;
    value: string;
    selected?: boolean;
}
export declare class IgeUiDropDown extends IgeUiElement {
    classId: string;
    _toggleState: boolean;
    _options: IgeUiDropDownOption[];
    _label: IgeUiLabel;
    constructor();
    options(ops?: IgeUiDropDownOption[]): this;
    addOption(op?: IgeUiDropDownOption): this;
    removeAllOptions(): void;
    /**
     * The blur method removes global UI focus from this UI element.
     */
    blur(): boolean;
    selectIndex(index: number): void;
    value(val?: IgeUiDropDownOption): any;
    toggle(): void;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
