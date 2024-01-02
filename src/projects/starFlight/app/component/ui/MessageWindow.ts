import { InfoWindow } from "./InfoWindow";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { ige } from "@/engine/instance";
import { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class MessageWindow extends InfoWindow {
	classId = "MessageWindow";
	_msgs: IgeUiLabel[] = [];
	_options: {
		messageFont?: string;
		messageColor?: string;
	};

	constructor(options = {}) {
		super(options);

		(ige.network as IgeNetIoClientController).on("msg", (data) => {
			this.addMsg(data.msg);
		});

		this._options = options;
	}

	addMsg(msg: string) {
		this._msgs.push(
			new IgeUiLabel()
				.layer(1)
				.font(this._options.messageFont || "8px Verdana")
				.height(15)
				.width(this.width())
				.left(0)
				.textAlignX(0)
				.textAlignY(1)
				.textLineSpacing(15)
				.color(this._options.messageColor || "#7bdaf1")
				.value(msg)
				.mount(this)
		);
	}

	tick(ctx: IgeCanvasRenderingContext2d, dontTransform = false) {
		// Loop children and re-position then
		const arr = this._children as IgeUiEntity[];
		const arrCount = arr.length;
		let currentY = 5;

		const width = this.width();

		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];

			if (item.classId !== "Tab") {
				const itemY = item._bounds2d.y;

				item.top(currentY);
				item.width(width);

				currentY += itemY;
			}
		}

		// Now do the super-class tick
		super.tick(ctx, dontTransform);
	}
}
