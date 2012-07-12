var IgeUiEntity = IgeEntity.extend({
	init: function () {
		this._super();

		// Implement the UI extensions
		this.implement(IgeUiStyleExtension);
		this.implement(IgeUiPositionExtension);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiEntity; }