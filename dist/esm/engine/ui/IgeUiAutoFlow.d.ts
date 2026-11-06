import { IgeUiElement } from "../core/IgeUiElement.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js";
export declare class IgeUiAutoFlow extends IgeUiElement {
    classId: string;
    _currentHeight: number;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
