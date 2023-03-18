import { IgeUiElement } from "../core/IgeUiElement";
export declare class IgeUiWindow extends IgeUiElement {
    classId: string;
    constructor();
    _dragStart(): true | undefined;
    _dragMove(): true | undefined;
    _dragEnd(): true | undefined;
    draggable(val: any): void;
    blur(): void;
    title(val: any): any;
    titleColor(val: any): any;
    titleFont(val: any): any;
}
