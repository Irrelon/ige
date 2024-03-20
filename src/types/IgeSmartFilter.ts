import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeImage } from "@/types/IgeImage";

export type IgeSmartFilter = (
	canvas: OffscreenCanvas,
	ctx: IgeCanvasRenderingContext2d,
	originalImage: IgeImage,
	texture: IgeTexture,
	data: any
) => void;
