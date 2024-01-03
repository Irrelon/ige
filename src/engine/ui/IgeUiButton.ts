import { IgeUiElement } from "@/export/exports";
import { registerClass } from "@/export/exports";
import type { IgeCanvasRenderingContext2d } from "@/export/exports";

export class IgeUiButton extends IgeUiElement {
	classId = "IgeUiButton";

	_autoCell: boolean = false;

	constructor () {
		super();

		this.on("pointerDown", () => {
			if (this._autoCell && this._cell !== null) {
				// React to the mouse events
				this.cell(this._cell + 1);
				this.cacheDirty(true);
			}
		});

		this.on("pointerUp", () => {
			if (this._autoCell && this._cell !== null) {
				// React to the mouse events
				this.cell(this._cell - 1);
				this.cacheDirty(true);
			}
		});
	}

	/**
	 * Gets / sets the auto cell flag. If true the button will automatically
	 * react to being clicked on and update the texture cell to +1 when mousedown
	 * and -1 when mouseup allowing you to define cell sheets of button graphics
	 * with the up-state on cell 1 and the down-state on cell 2.
	 * @param {Boolean=} val Either true or false.
	 * @returns {*}
	 */
	autoCell (val?: boolean) {
		if (val !== undefined) {
			this._autoCell = val;

			if (val) {
				this.pointerEventsActive(true);
			}
			return this;
		}

		return this._autoCell;
	}

	/**
	 * Fires a mouse-down and a mouse-up event for the entity.
	 * @returns {*}
	 */
	click () {
		if (this._pointerDown) {
			this._pointerDown();
		}
		if (this._pointerUp) {
			this._pointerUp();
		}

		return this;
	}

	tick (ctx: IgeCanvasRenderingContext2d) {
		super.tick(ctx);

		// Now draw any ui overlays

		// Check for the old way to assign text to the button
		const uiData = this.data("ui");
		if (uiData) {
			// Draw text
			if (uiData.text) {
				ctx.font = uiData.text.font || "normal 12px Verdana";
				ctx.textAlign = uiData.text.align || "center";
				ctx.textBaseline = uiData.text.baseline || "middle";
				ctx.fillStyle = uiData.text.color || "#ffffff";
				ctx.fillText(uiData.text.value, 0, 0);
			}
		}

		// Check for the new way to assign text to the button
		if (this._value) {
			// Draw text
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = this._color;
			ctx.fillText(this._value, 0, 0);
		}
	}
}

registerClass(IgeUiButton);
