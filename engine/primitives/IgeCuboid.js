var IgeCuboid = IgeEntity.extend({
	classId: 'IgeCuboid',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
		
		this.bounds3d(40, 40, 40);
		
		var tex = new IgeTexture(IgeCuboidSmartTexture);
		this.texture(tex);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeCuboid; }