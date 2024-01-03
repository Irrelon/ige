import { IgeUiButton } from "../../export/exports.js"
import type { IgeObject } from "../../export/exports.js"
export declare class IgeUiRadioButton extends IgeUiButton {
    classId: string;
    _uiRadioGroup?: number;
    _uiOnSelect?: () => void;
    _uiOnDeSelect?: () => void;
    _uiSelected: boolean;
    _parent: IgeObject | null;
    radioGroup(val: number): number | this | undefined;
    select(val: () => void): this;
    deSelect(val: any): this;
}
