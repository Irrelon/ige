var Cuboid = IgeEntity.extend({
	classId: 'Cuboid',
	
	init: function (mouseMoveFunc, mouseOutFunc) {
		IgeEntity.prototype.init.call(this);
		
		
		this.isometric(true)
			.mouseMove(mouseMoveFunc)
			.mouseOut(mouseOutFunc)
			.mouseEventsActive(true)
			.mouseEventTrigger('isoBounds')
			.opacity(0.95)
	}
});