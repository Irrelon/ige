import type { IgeTexture } from "../engine/core/IgeTexture.js"
import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d.js"
import type { IgeImage } from "./IgeImage.js";
export type IgeSmartFilter<DataType = any> = (canvas: OffscreenCanvas, ctx: IgeCanvasRenderingContext2d, originalImage: IgeImage, texture: IgeTexture, data: DataType) => void;
