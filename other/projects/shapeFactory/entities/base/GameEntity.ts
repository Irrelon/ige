import { isServer } from "@/engine/clientServer";
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";
import { IgeStreamMode } from "@/enums/IgeStreamMode";

export class GameEntity extends IgeEntity {
	constructor () {
		super();

		//this.isometric(ige.data("isometric"));
		this.streamMode(IgeStreamMode.simple);
		this.streamSections(["transform", "props"]);

		// Define a function that will be called when the
		// mouse cursor moves over one of our entities
		const overFunc = function (this: IgeEntity) {
			this.highlight(true);
			this.drawBounds(true);
			//this.drawBoundsData(true);
		};

		// Define a function that will be called when the
		// mouse cursor moves away from one of our entities
		const outFunc = function (this: IgeEntity) {
			this.highlight(false);
			this.drawBounds(false);
			//this.drawBoundsData(false);
		};

		//this.pointerOver(overFunc);
		//this.pointerOut(outFunc);
	}

	mount (obj: IgeObject): this {
		if (isServer) {
			this.streamProperty("mount", obj.id());
		}
		return super.mount(obj);
	}

	onStreamProperty (propName: string, propVal: any): this {
		switch (propName) {
		case "mount":
			this.mount(ige.$(propVal));
		}
		return this;
	}
}

registerClass(GameEntity);
