import type { IgeCanvasRenderingContext2d } from "../export/exports.js"
import type { IgeTexture } from "../export/exports.js"
import type { IgeImage } from "../export/exports.js"
export type IgeSmartFilter = (canvas: OffscreenCanvas, ctx: IgeCanvasRenderingContext2d, originalImage: IgeImage, texture: IgeTexture, data: any) => void;
