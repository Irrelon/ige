// TODO: Should we create a more generic "IgeScene2dCached" or something? Other scenes might want to auto-cache...
var IgeSceneUi = IgeScene2d.extend({
	classId: 'IgeSceneUi',

	init: function () {
		this._super();

		// Create our own canvas and context so that when
		// we render stuff, we can keep an image of it cached
		this._canvas = document.createElement('canvas');
		this._canvas.width = ige.geometry.x;
		this._canvas.height = ige.geometry.y;
		this._ctx = this._canvas.getContext('2d');

		document.body.appendChild(this._canvas);
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx) {
		if (this._shouldRender) {
			if (this._dirty) {
				// The UI scene is dirty so redraw it to the
				// cached canvas first
				if (ctx === this._ctx) {
					// The canvas context we are being asked to
					// paint to is our own cached one so do it
					this._dirty = false;
					// Translate the whole context back to the top-left of the viewport
					this._super(ctx, true);
				} else {
					// The canvas context we are being asked to
					// paint to is not our cached one so by-pass
					// rendering to this one and call the engine
					// renderer to render our scene to the cached
					// canvas
					ige.render(this._ctx, this);
				}
			} else {
				// Now render our cached canvas
				ctx.drawImage(this._canvas, -(ige.geometry.x2), -(ige.geometry.y2));
			}
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Resize our cache canvas
		this._canvas.width = ige.geometry.x;
		this._canvas.height = ige.geometry.y;
		this._ctx = this._canvas.getContext('2d');

		this.dirty(true);
		this._super();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; }