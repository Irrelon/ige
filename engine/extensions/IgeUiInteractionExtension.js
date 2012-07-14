var IgeUiInteractionExtension = {
	mouseMove: function (callback) {
		if (callback) {
			this._mouseMove = callback;
			return this;
		}

		return this._mouseMove;
	},

	mouseOver: function (callback) {
		if (callback) {
			this._mouseOver = callback;
			return this;
		}

		return this._mouseOver;
	},

	mouseOut: function (callback) {
		if (callback) {
			this._mouseOut = callback;
			return this;
		}

		return this._mouseOut;
	},

	mouseUp: function (callback) {
		if (callback) {
			this._mouseUp = callback;
			return this;
		}

		return this._mouseUp;
	},

	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			return this;
		}

		return this._mouseDown;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiInteractionExtension; }