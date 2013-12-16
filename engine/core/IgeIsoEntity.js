var IgeIsoEntity = IgeEntity.extend({
	classId: 'IgeIsoEntity',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
		
		this._image = new IgeEntity()
			.mount(this);
	},
	
	image: function () {
		return this._image;
	},
	
	imageTexture: function (val) {
		return this._image.texture(val);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeIsoEntity; }