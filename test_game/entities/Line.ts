import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";
import IgeRect from "../../engine/core/IgeRect";

export class Line extends IgeEntity {
	classId = 'Line';
	_initVals: IgeRect;

	constructor (x1: number, y1: number, x2: number, y2: number) {
		super();

		this._initVals = new IgeRect(x1, y1, x2 ,y2);

		this.data("glowColor", "#ffea00")
			.depth(0)
			.width(x2 - x1)
			.height(y2 - y1)
			.translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);

		if (isClient) {
			this.texture(textures.getTextureById("line"));
		}
	}

	streamCreateData (allGood: boolean = false) {
		return [this._initVals.x, this._initVals.y, this._initVals.width, this._initVals.height];
	}
}

registerClass(Line);