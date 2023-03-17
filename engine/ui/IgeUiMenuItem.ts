import IgeUiElement from "../core/IgeUiElement";
import { IgeUiMenu } from "./IgeUiMenu";

export class IgeUiMenuItem extends IgeUiElement {
	classId = "IgeUiMenuItem";

	menuData (menuData) {
		if (menuData !== undefined) {
			this._menuData = menuData;

			if (menuData.width) {
				this.width(menuData.width);
			}
			if (menuData.id) {
				this.id(menuData.id);
			}
			if (menuData.mouseUp) {
				this.mouseUp(menuData.mouseUp);
			}
			if (menuData.mouseOver) {
				this.mouseOver(menuData.mouseOver);
			}
			if (menuData.mouseOut) {
				this.mouseOut(menuData.mouseOut);
			}

			this._labelEntity = new IgeFontEntity()
				.id(this.id() + "_label")
				.texture(this._fontSheet)
				.left(5)
				.middle(0)
				.width(menuData.width)
				.height(this.height())
				.textAlignX(0)
				.textAlignY(1)
				.text(menuData.text)
				.mount(this);

			return this;
		}

		return this._menuData;
	}

	/**
	 * Gets / sets the font sheet (texture) that the menu item will
	 * use when rendering text.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet (fontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;
			return this;
		}

		return this._fontSheet;
	}

	/**
	 * Opens the menu item so it's child items are visible.
	 */
	open () {
		if (this._menuData.items) {
			this._childMenu = new IgeUiMenu()
				.id(this.id() + "_childMenu")
				.depth(this.depth() + 1)
				.fontSheet(this._fontSheet)
				.left(0)
				.top(this.height())
				.width(100)
				.height(30)
				.menuMode(1)
				.menuData(this._menuData.items)
				.mount(this);
		}
	}

	/**
	 * Closes the menu item so it's child items are hidden.
	 */
	close () {
		if (this._childMenu) {
			this._childMenu.destroy();
		}
	}
}