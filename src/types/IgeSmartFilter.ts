import type { IgeCanvasRenderingContext2d } from "@/export/exports";
import type { IgeTexture } from "@/export/exports";
import type { IgeImage } from "@/export/exports";

export type IgeSmartFilter = (
	canvas: OffscreenCanvas,
	ctx: IgeCanvasRenderingContext2d,
	originalImage: IgeImage,
	texture: IgeTexture,
	data: any
) => void;
