import type { IgeTexture } from "../export/exports.js"
import type { IgeCanvas } from "../export/exports.js"
declare global {
    interface ImageBitmap {
        _igeTextures: IgeTexture[];
        _loaded: boolean;
        src: string;
    }
}
export type IgeImage = ImageBitmap | IgeCanvas;
