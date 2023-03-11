var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import IgeTexture from "../../../engine/core/IgeTexture.js";
import simpleBox from "../assets/textures/smartTextures/simpleBox.js";
export class Textures {
    constructor() {
        this._texture = {};
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this._texture = {
                fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
                simpleBox: new IgeTexture(simpleBox)
            };
            const promiseArr = Object.values(this._texture).map((tmpIgeTexture) => {
                return tmpIgeTexture.whenLoaded();
            });
            return Promise.all(promiseArr);
        });
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
