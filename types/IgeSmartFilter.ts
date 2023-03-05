import IgeTexture from "../engine/core/IgeTexture";
import IgeImage from "../engine/core/IgeImage";
import IgeCanvas from "../engine/core/IgeCanvas";

export type IgeSmartFilter = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    originalImage: IgeImage | IgeCanvas,
    texture: IgeTexture,
    data: any
) => void;
