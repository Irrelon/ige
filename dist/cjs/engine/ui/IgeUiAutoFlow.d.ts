import { IgeUiElement } from "../../export/exports.js"
import type { IgeCanvasRenderingContext2d } from "../../export/exports.js"
export declare class IgeUiAutoFlow extends IgeUiElement {
    classId: string;
    _currentHeight: number;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
