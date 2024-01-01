import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export declare class IgeUiAutoFlow extends IgeUiElement {
    classId: string;
    _currentHeight: number;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
