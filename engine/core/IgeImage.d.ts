import { IgeTexture } from "./IgeTexture";
import { IgeImageLike } from "../../types/IgeImageLike";
export declare class IgeImage extends Image implements IgeImageLike {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
}
