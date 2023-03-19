import { ige } from "../../../engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { IgeRect } from "../../../engine/core/IgeRect";
import { GameEntity } from "./GameEntity";

export class Line extends GameEntity {
	classId = 'Line';
	_initVals?: IgeRect;

	constructor (x1?: number, y1?: number, x2?: number, y2?: number) {
		super();

		if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
			this.setLine(x1, y1, x2, y2);
		}
	}

	setLine (x1: number, y1: number, x2: number, y2: number) {
		this._initVals = new IgeRect(x1, y1, x2 ,y2);

		this.data("glowColor", "#ffea00")
			.depth(0)
			.width(x2 - x1)
			.height(y2 - y1)
			.translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);

		if (isClient) {
			this.texture(ige.textures.get("line"));
		}
	}
}

registerClass(Line);
