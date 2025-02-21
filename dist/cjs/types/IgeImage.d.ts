import type { IgeTexture } from "../engine/core/IgeTexture.js"
import type { IgeCanvas } from "./IgeCanvas.js"
declare global {
    interface ImageBitmap {
        _igeTextures: IgeTexture[];
        _loaded: boolean;
        src: string;
    }
}
export type IgeImage = ImageBitmap | IgeCanvas;
