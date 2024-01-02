import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeImage } from "@/types/IgeImage";

export type IgeSmartFilter = (
	canvas: OffscreenCanvas,
	ctx: IgeCanvasRenderingContext2d,
	originalImage: IgeImage,
	texture: IgeTexture,
	data: any
) => void;
