import IgeTexture from "./IgeTexture";
import { IgeImageLike } from "../../types/IgeImageLike";

class IgeCanvas extends HTMLCanvasElement implements IgeImageLike {
	_igeTextures: IgeTexture[] = [];
	_loaded: boolean = false;
}

export default IgeCanvas;
