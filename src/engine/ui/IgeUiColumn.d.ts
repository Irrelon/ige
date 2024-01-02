import { IgeUiElement } from "@/engine/core/IgeUiElement";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export declare class IgeUiColumn extends IgeUiElement {
	classId: string;
	tick(ctx: IgeCanvasRenderingContext2d): void;
}
