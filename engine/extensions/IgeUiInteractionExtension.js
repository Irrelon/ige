var IgeUiInteractionExtension = {
	/**
	 * Gets / sets the callback that is fired when a mouse
	 * move event is triggered.
	 * @param {Function=} callback
	 * @return {*}
	 */
	mouseMove: function (callback) {
		if (callback) {
			this._mouseMove = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseMove;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * move event is triggered.
	 */
	mouseMoveOff: function () {
		delete this._mouseMove;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * over event is triggered.
	 * @param {Function=} callback
	 * @return {*}
	 */
	mouseOver: function (callback) {
		if (callback) {
			this._mouseOver = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOver;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * over event is triggered.
	 */
	mouseOverOff: function () {
		delete this._mouseOver;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * out event is triggered.
	 * @param {Function=} callback
	 * @return {*}
	 */
	mouseOut: function (callback) {
		if (callback) {
			this._mouseOut = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseOut;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * out event is triggered.
	 */
	mouseOutOff: function () {
		delete this._mouseOut;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * up event is triggered.
	 * @param {Function=} callback
	 * @return {*}
	 */
	mouseUp: function (callback) {
		if (callback) {
			this._mouseUp = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseUp;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * up event is triggered.
	 */
	mouseUpOff: function () {
		delete this._mouseUp;
	},

	/**
	 * Gets / sets the callback that is fired when a mouse
	 * down event is triggered.
	 * @param {Function=} callback
	 * @return {*}
	 */
	mouseDown: function (callback) {
		if (callback) {
			this._mouseDown = callback;
			this._mouseEventsActive = true;
			return this;
		}

		return this._mouseDown;
	},

	/**
	 * Removes the callback that is fired when a mouse
	 * down event is triggered.
	 */
	mouseDownOff: function () {
		delete this._mouseDown;
	},

	/**
	 * Handler method that determines which mouse-move event
	 * to fire, a mouse-over or a mouse-move.
	 * @private
	 */
	_handleMouseIn: function (event) {
		// TODO: Set local mouse point based on 0, 0 at top-left of entity rather than screen
		// Check if the mouse move is a mouse over
		if (!this._mouseStateOver) {
			this._mouseStateOver = true;
			if (this._mouseOver) { this._mouseOver(event); }
		}

		if (this._mouseMove) { this._mouseMove(event); }
	},

	/**
	 * Handler method that determines if a mouse-out event
	 * should be fired.
	 * @private
	 */
	_handleMouseOut: function (event) {
		// The mouse went away from this entity so
		// set mouse-down to false, regardless of the situation
		this._mouseStateDown = false;

		// Check if the mouse move is a mouse out
		if (this._mouseStateOver) {
			this._mouseStateOver = false;
			if (this._mouseOut) { this._mouseOut(event); }
		}
	},

	/**
	 * Handler method that determines if a mouse-up event
	 * should be fired.
	 * @private
	 */
	_handleMouseUp: function (event) {
		// Reset the mouse-down flag
		this._mouseStateDown = false;
		if (this._mouseUp) { this._mouseUp(event); }
	},

	/**
	 * Handler method that determines if a mouse-down event
	 * should be fired.
	 * @private
	 */
	_handleMouseDown: function (event) {
		if (!this._mouseStateDown) {
			this._mouseStateDown = true;
			if (this._mouseDown) { this._mouseDown(event); }
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiInteractionExtension; }