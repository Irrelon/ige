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
		// The mouse went away from this entity so
		// set mouse-down to false, regardless of the situation
		this._mouseStateDown = false;

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
		// Reset the mouse-down flag
		this._mouseStateDown = false;
		if (this._mouseUp) { this._mouseUp.call(this); }
	},

	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			return this;
		}

		return this._mouseDown;
	},

	_handleMouseDown: function () {
		if (!this._mouseStateDown) {
			this._mouseStateDown = true;
			if (this._mouseDown) { this._mouseDown.call(this); }
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiInteractionExtension; }