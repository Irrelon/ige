import { IgeUiElement } from "../core/IgeUiElement.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
export declare class IgeUiInlineFlow extends IgeUiElement {
    classId: string;
    tick(ctx: IgeCanvasRenderingContext2d, dontTransform?: boolean): void;
}
