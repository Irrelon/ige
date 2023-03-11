import IgeTexture from "../../../engine/core/IgeTexture";
import simpleBox from "../assets/textures/smartTextures/simpleBox";

export class Textures {
	_texture: Record<string, IgeTexture> = {};

	async load () {
		this._texture = {
			fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
			simpleBox: new IgeTexture(simpleBox)
		};

		const promiseArr = Object.values(this._texture).map((tmpIgeTexture) => {
			return tmpIgeTexture.whenLoaded();
		});

		return Promise.all(promiseArr);
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
