var IgeUiInteractionExtension = {
	mouseMove: function (callback) {
		if (callback) {
			this._mouseMove = callback;
			return this;
		}

		return this._mouseMove;
	},

	_handleMouseIn: function () {
		// TODO: Set local mouse point based on 0, 0 at top-left of entity rather than screen
		// Check if the mouse move is a mouse over
		if (!this._mouseStateOver) {
			this._mouseStateOver = true;
			if (this._mouseOver) { this._mouseOver.call(this); }
		}

		if (this._mouseMove) { this._mouseMove.call(this); }
	},

	_handleMouseOut: function () {
		// Check if the mouse move is a mouse out
		if (this._mouseStateOver) {
			this._mouseStateOver = false;
			if (this._mouseOut) { this._mouseOut.call(this); }
		}
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

	_handleMouseUp: function () {

	},

	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			return this;
		}

		return this._mouseDown;
	},

	_handleMouseDown: function () {

	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiInteractionExtension; }