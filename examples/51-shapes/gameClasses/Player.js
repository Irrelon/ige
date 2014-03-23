var Player = IgeEntityBox2d.extend({
	classId: 'Player',
	
	init: function () {
		var self = this;
		IgeEntityBox2d.prototype.init.call(this);
		
		self._trustPower = 10;
		
		self.width(40)
			.height(40);
		
		self.box2dBody({
			type: 'dynamic',
			linearDamping: 1,
			angularDamping: 1,
			allowSleep: true,
			bullet: false,
			fixedRotation: false,
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
	},
	
	update: function (ctx) {
		if (ige.gamePad && ige.gamePad.gamepads[0]) {
			var pad = ige.gamePad.gamepads[0],
				x = 0,
				y = 0;
			
			if (pad.axes[0] > 0.1 || pad.axes[0] < -0.1) {
				x = pad.axes[0] * this._trustPower;
			}
			
			if (pad.axes[1] > 0.1 || pad.axes[1] < -0.1) {
				y = pad.axes[1] * this._trustPower;
			}
			
			this._box2dBody.SetLinearVelocity(new IgePoint3d(x, y, 0));
			this._box2dBody.SetAwake(true);
		}
		
		IgeEntityBox2d.prototype.update.call(this, ctx);
		
		// Check OO bounds
		if (this._translate.x + this._bounds2d.x2 > ige._bounds2d.x2) {
			this.translateTo(ige._bounds2d.x2 - this._bounds2d.x2, this._translate.y, this._translate.z);
		}
		
		if (this._translate.x - this._bounds2d.x2 < -ige._bounds2d.x2) {
			this.translateTo(-ige._bounds2d.x2 + this._bounds2d.x2, this._translate.y, this._translate.z);
		}
		
		if (this._translate.y + this._bounds2d.y2 > ige._bounds2d.y2) {
			this.translateTo(this._translate.x, ige._bounds2d.y2 - this._bounds2d.y2, this._translate.z);
		}
		
		if (this._translate.y - this._bounds2d.y2 < -ige._bounds2d.y2) {
			this.translateTo(this._translate.x, -ige._bounds2d.y2 + this._bounds2d.y2, this._translate.z);
		}
	}
});