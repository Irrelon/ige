import { IgeTexture } from "@/engine/core/IgeTexture";
export interface IgeImageLike {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
    width: number;
    height: number;
}
