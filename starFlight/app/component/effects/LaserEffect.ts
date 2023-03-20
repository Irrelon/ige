var appCore = require('../../../../ige');

appCore.module('LaserEffect', function ($ige, $textures, $game, IgeEntity) {
	var LaserEffect = IgeEntity.extend({
		classId: 'LaserEffect',
		
		init: function (data) {
			IgeEntity.prototype.init.call(this);
			
			var self = this;
			
			if (!$ige.isServer) {
				this.texture($textures.get('laser1'));
			}
			
			this._data = data;
			this._scanX = 0;
			this._scanY = 0;
			this._scanSpeedX = 0.05;
			this._scanSpeedY = 0.02;
			this._scanDirX = true;
			this._scanDirY = false;
			this._scanMaxX = 10;
			this._scanMaxY = 10;
			
			this.streamProperty('from', '');
			this.streamProperty('to', '');
			
			// Make sure we stream properties!
			this.streamSectionsPush('props');
			
			if (!$ige.isServer) {
				this.on('streamPropChange', function (propName, value) {
					var targetEnt;
					
					if (value) {
						// Add link
						targetEnt = $ige.engine.$(value);
					}
					
					if (propName === 'from') {
						self._fromEntity = targetEnt;
					}
					
					if (propName === 'to') {
						self._toEntity = targetEnt;
					}
				});
			}
			
			this.layer(3);
		},
		
		update: function (ctx) {
			if (this._fromEntity && this._toEntity) {
				// Make sure our target entities are alive and if not
				// remove them from our cache to avoid issues
				if (!this._fromEntity.alive()) {
					this._fromEntity = undefined;
				}
				
				if (!this._toEntity.alive()) {
					this._toEntity = undefined;
				}
				
				if (this._scanDirX === true) {
					this._scanX += this._scanSpeedX;
					
					if (this._scanX > this._scanMaxX) {
						this._scanDirX = !this._scanDirX;
					}
				} else {
					this._scanX -= this._scanSpeedX;
					
					if (this._scanX < -this._scanMaxX) {
						this._scanDirX = !this._scanDirX;
					}
				}
				
				if (this._scanDirY === true) {
					this._scanY += this._scanSpeedY;
					
					if (this._scanY > this._scanMaxY) {
						this._scanDirY = !this._scanDirY;
					}
				} else {
					this._scanY -= this._scanSpeedY;
					
					if (this._scanY < -this._scanMaxY) {
						this._scanDirY = !this._scanDirY;
					}
				}
			}
			
			IgeEntity.prototype.update.call(this, ctx);
		}
	});
	
	return LaserEffect;
});