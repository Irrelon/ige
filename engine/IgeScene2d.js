var IgeScene2d = IgeObject.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._super();

		this._shouldRender = true;
		this._viewportDepth = false;
		this._viewports = [];

		// Add the default viewport to the scene
		this.addViewport(
			new IgeViewport({
				left: 0,
				top: 0,
				width: ige._canvas.width,
				height: ige._canvas.height,
				autoSize: true
			})
		);
	},

	/**
	 * Gets / sets the _shouldRender property. If set to true, the scene's child
	 * object's tick methods will be called.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	shouldRender: function (val) {
		if (val !== undefined) {
			this._shouldRender = val;
		}

		return this._shouldRender;
	},

	/**
	 * Gets / sets the flag that determines if viewports should be sorted by depth
	 * like regular entities, before they are processed for rendering each frame.
	 * Depth-sorting viewports increases processing requirements so if you do not
	 * need to stack viewports in a particular order, keep this flag false.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	viewportDepth: function (val) {
		if (val !== undefined) {
			this._viewportDepth = val;
		}

		return this._viewportDepth;
	},

	/**
	 * Adds a viewport to the scene.
	 * @param {IgeViewport} viewport
	 * @return {Boolean}
	 */
	addViewport: function (viewport) {
		if (viewport) {
			viewport._scene = this;
			this._viewports.push(viewport);
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Gets the viewport at the index specified and returns it.
	 * @param {Number} index
	 * @return {IgeViewport}
	 */
	viewport: function (index) {
		return this._viewports[index];
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function () {
		if (this._shouldRender) {
			// Depth-sort the viewports
			if (this._viewportDepth) {
				this._depthSortViewports();
			}

			// Loop each viewport
			var vpArr = this._viewports,
				vpCount = vpArr.length,
				vpIndex = 0,
				ctx = ige._ctx;

			for (vpIndex; vpIndex < vpCount; vpIndex++) {
				ctx.save();
					// Tick each viewport which will translate the
					// context to the viewport center and then clip
					// it so drawing only occurs inside the viewport
					vpArr[vpIndex].tick();

					// Now tick all children (entities etc)
					this._super();
				ctx.restore();
			}
		}
	},

	_resizeEvent: function (event) {
		// Resize any autoSize viewports
		var arr = this._viewports,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; }