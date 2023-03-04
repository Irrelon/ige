import IgeTexture from "../../engine/core/IgeTexture.js";
import square from "../assets/textures/smartTextures/square.js";
import line from "../assets/textures/smartTextures/line.js";
import triangle from "../assets/textures/smartTextures/triangle.js";
import circle from "../assets/textures/smartTextures/circle.js";
export class Textures {
    constructor() {
        this._texture = {};
    }
    load() {
        this._texture = {
            fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
            square: new IgeTexture(square),
            line: new IgeTexture(line),
            triangle: new IgeTexture(triangle),
            circle: new IgeTexture(circle)
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
