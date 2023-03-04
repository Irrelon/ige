import IgeTexture from "../../engine/core/IgeTexture.js";
import square from "../assets/textures/smartTextures/square.js";
export class Textures {
    constructor() {
        this._texture = {};
    }
    load() {
        this._texture = {
            fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
            square: new IgeTexture(square)
        };
    }
    getTextureById(id) {
        const texture = this._texture[id];
        if (!texture) {
            throw new Error(`"Cannot find texture with id "${id}"`);
        }
        return texture;
    }
}
export const textures = new Textures();
