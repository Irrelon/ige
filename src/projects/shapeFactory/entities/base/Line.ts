import { GameEntity } from "./GameEntity";
import { isClient } from "@/engine/clientServer";
import { IgeRect } from "@/engine/core/IgeRect";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/instance";

export class Line extends GameEntity {
	classId = "Line";
	_initVals?: IgeRect;

	constructor (x1?: number, y1?: number, x2?: number, y2?: number) {
		super();

		if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
			this.setLine(x1, y1, x2, y2);
		}
	}

	setLine (x1: number, y1: number, x2: number, y2: number) {
		this._initVals = new IgeRect(x1, y1, x2, y2);

		this.data("glowColor", "#ff9100")
			.layer(0)
			.width(x2 - x1)
			.height(y2 - y1)
			.translateTo(x2 / 2 + x1 / 2, y2 / 2 + y1 / 2, 0);

		if (isClient) {
			this.texture(ige.textures.get("lineSmartTexture"));
		}
	}
}

registerClass(Line);
