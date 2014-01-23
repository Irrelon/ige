var Cuboid = IgeEntity.extend({
	classId: 'Cuboid',
	
	init: function (mouseMoveFunc, mouseOutFunc) {
		IgeEntity.prototype.init.call(this);
		
		this.isometric(true)
			.mouseMove(mouseMoveFunc)
			.mouseOut(mouseOutFunc)
			.mouseEventsActive(true)
			.triggerPolygon('bounds3dPolygon')
			.opacity(0.95)
	}
});