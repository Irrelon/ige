var RenderOverrideEntity = Rotator.extend({
	classId: 'RenderOverrideEntity',
	
	updateTransform: function () {
		IgeEntity.prototype.updateTransform.call(this);
		
		// Squish the entity output on the y axis by 50%
		//this._localMatrix.multiply(this._localMatrix._newScale(1, 0.5));
		
	}
});