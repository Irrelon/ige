import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export declare class IgeUiInlineFlow extends IgeUiElement {
	classId: string;
	tick(ctx: IgeCanvasRenderingContext2d, dontTransform?: boolean): void;
}
