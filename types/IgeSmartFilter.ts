import IgeTexture from "../engine/core/IgeTexture";
import { IgeImage } from "../engine/core/IgeImage";
import { IgeCanvas } from "../engine/core/IgeCanvas";
import { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";

export type IgeSmartFilter = (
    canvas: HTMLCanvasElement,
    ctx: IgeCanvasRenderingContext2d,
    originalImage: IgeImage | IgeCanvas,
    texture: IgeTexture,
    data: any
) => void;
