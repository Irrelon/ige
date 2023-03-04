import IgeTexture from "../../engine/core/IgeTexture";
import square from "../assets/textures/smartTextures/square";
import line from "../assets/textures/smartTextures/line";
import triangle from "../assets/textures/smartTextures/triangle";
import circle from "../assets/textures/smartTextures/circle";

export class Textures {
	_texture: Record<string, IgeTexture> = {};

	load () {
		this._texture = {
			fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
			square: new IgeTexture(square),
			line: new IgeTexture(line),
			triangle: new IgeTexture(triangle),
			circle: new IgeTexture(circle)
		};
	}

	getTextureById  (id: string){
		const texture = this._texture[id];
		if (!texture) {
			throw new Error(`"Cannot find texture with id "${id}"`);
		}

		return texture;
	}
}

export const textures = new Textures();
