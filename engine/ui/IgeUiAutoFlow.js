var IgeUiAutoFlow = IgeUiElement.extend({
	classId: 'IgeUiAutoFlow',

	init: function () {
		IgeUiElement.prototype.init.call(this);

		this._currentHeight = 0;
	},

	tick: function (ctx) {
		// Loop children and re-position then
		var arr = this._children,
			arrCount = arr.length, i,
			item, itemY, currentY = 0;

		for (i = 0; i < arrCount; i++) {
			item = arr[i];
			itemY = item._bounds2d.y;

			item.top(currentY);

			currentY += itemY;
		}

		// Now do the super-class tick
		IgeUiElement.prototype.tick.call(this, ctx);
	}
});