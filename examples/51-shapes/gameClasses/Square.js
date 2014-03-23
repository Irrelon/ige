var Square = IgeEntityBox2d.extend({
	classId: 'Square',
	
	init: function () {
		var self = this;
		IgeEntityBox2d.prototype.init.call(this);
		
		self.texture(ige.client.gameTexture.shapes.square);
	},
	
	ready: function () {
		var self = this;
		
		self.width(40)
			.height(40);
		
		self.box2dBody({
			type: 'static',
			allowSleep: true,
			fixtures: [{
				density: 0.0,
				friction: 0.0,
				restitution: 0.0,
				isSensor: false,
				shape: {
					type: 'rectangle'
				}
			}]
		});
		
		self.on('collisionStart', '#player', function () {
			self.destroy();
			ige.client.spawnTarget();
		});
	}
});