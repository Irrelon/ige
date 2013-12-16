var IgeIsoEntity = IgeEntity.extend({
	classId: 'IgeIsoEntity',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
		
		this._imageEntity = new IgeEntity()
			.mount(this);
	}
});