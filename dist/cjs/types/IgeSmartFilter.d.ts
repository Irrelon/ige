import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";
import { IgeImage } from "@/types/IgeImage";
export type IgeSmartFilter = (canvas: OffscreenCanvas, ctx: IgeCanvasRenderingContext2d, originalImage: IgeImage, texture: IgeTexture, data: any) => void;