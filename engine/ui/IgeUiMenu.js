/**
 * Provides a UI drop-down menu entity.
 */
var IgeUiMenu = IgeUiElement.extend({
	classId: 'IgeUiMenu',

	/**
	 * Gets / sets the menu definition.
	 * @param {Object=} val The menu definition object.
	 * @return {*}
	 */
	menuData: function (val) {
		if (val !== undefined) {
			this._menuData = val;

			// Remove all existing children from the menu
			this.destroyChildren();

			// Build the new menu
			this._buildMenu(this._menuData, this);
			return this;
		}

		return this._menuData;
	},

	menuMode: function (mode) {
		if (mode !== undefined) {
			this._menuMode = mode;
			return this;
		}

		return this._menuMode;
	},

	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet: function (fontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;
			return this;
		}

		return this._fontSheet;
	},

	addItem: function (item) {
		if (item !== undefined) {
			
		}
	},

	_buildMenu: function (data, parent) {
		var arrCount = data.length, i,
			item, ent, left = 0, top = 0;

		for (i = 0; i < arrCount; i++) {
			item = data[i];

			if (this._menuMode) {
				top += this.height();
			}

			ent = new IgeUiMenuItem()
				.backgroundColor('#666666')
				.left(left)
				.middle(top)
				.height(this.height())
				.fontSheet(this._fontSheet)
				.menuData(item)
				.mount(parent);

			if (!this._menuMode) {
				left += item.width;
			}
		}
	}
});

var IgeUiMenuItem = IgeUiElement.extend({
	classId: 'IgeUiMenuItem',

	menuData: function (menuData) {
		if (menuData !== undefined) {
			this._menuData = menuData;

			if (menuData.width) { this.width(menuData.width); }
			if (menuData.id) { this.id(menuData.id); }
			if (menuData.mouseUp) { this.mouseUp(menuData.mouseUp); }
			if (menuData.mouseOver) { this.mouseOver(menuData.mouseOver); }
			if (menuData.mouseOut) { this.mouseOut(menuData.mouseOut); }

			this._labelEntity = new IgeFontEntity()
				.id(this.id() + '_label')
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
	},

	/**
	 * Gets / sets the font sheet (texture) that the menu item will
	 * use when rendering text.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet: function (fontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;
			return this;
		}

		return this._fontSheet;
	},

	/**
	 * Opens the menu item so it's child items are visible.
	 */
	open: function () {
		if (this._menuData.items) {
			this._childMenu = new IgeUiMenu()
				.id(this.id() + '_childMenu')
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
	},

	/**
	 * Closes the menu item so it's child items are hidden.
	 */
	close: function () {
		if (this._childMenu) {
			this._childMenu.destroy();
		}
	}
});