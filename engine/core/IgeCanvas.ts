import IgeTexture from "./IgeTexture";
import { IgeImageLike } from "../../types/IgeImageLike";

export class IgeCanvas extends HTMLCanvasElement implements IgeImageLike {
	_igeTextures: IgeTexture[] = [];
	_loaded: boolean = false;
}