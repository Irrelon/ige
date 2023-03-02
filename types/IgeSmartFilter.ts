import IgeTexture from "../engine/core/IgeTexture";

export type IgeSmartFilter = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    originalImage: HTMLImageElement,
    texture: IgeTexture,
    data: any
) => void;
