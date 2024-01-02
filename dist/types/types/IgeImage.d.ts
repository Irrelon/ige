import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeCanvas } from "@/engine/core/IgeCanvas";
declare global {
    interface ImageBitmap {
        _igeTextures: IgeTexture[];
        _loaded: boolean;
        src: string;
    }
}
export type IgeImage = ImageBitmap | IgeCanvas;
