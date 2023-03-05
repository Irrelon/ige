var appCore = require('irrelon-appcore');

appCore.module('IgeUiTimeStream', function ($ige, $time, IgeUiElement) {
	var IgeUiTimeStream = IgeUiElement.extend({
		classId: 'IgeUiTimeStream',
		
		monitor: function (entity) {
			this._entity = entity;
		},
		
		tick: function (ctx) {
			// Draw timeline
			var i, text, xAdjust,
				arr, arrCount, arrItem,
				renderTime = $time._tickStart - $ige.engine.network.stream._renderLatency,
				deltaTime;
			
			IgeUiElement.prototype.tick.call(this, ctx);
			
			ctx.strokeStyle = '#fffc00';
			ctx.beginPath();
			ctx.moveTo(-200, -25.5);
			ctx.lineTo(200, -25.5);
			ctx.stroke();
			
			ctx.font = 'normal 10px Verdana';
			
			for (i = 0; i < 9; i++) {
				ctx.beginPath();
				if (((i - 2) * 10) === 0) {
					// This is the render point, change colour for this one
					ctx.strokeStyle = '#ff6600';
				} else {
					ctx.strokeStyle = '#ffffff';
				}
				ctx.moveTo(-200.5 + (i * 50), -30);
				ctx.lineTo(-200.5 + (i * 50), 30);
				ctx.stroke();
				
				text = -$ige.engine.network.stream._renderLatency + ((i - 2) * 10) + 'ms';
				xAdjust = ctx.measureText(text);
				ctx.strokeText(text, -200 + (i * 50) - (xAdjust.width / 2), -38);
				
				if (((i - 2) * 10) === 0) {
					text = 'Render Point';
					xAdjust = ctx.measureText(text);
					ctx.strokeText(text, -200 + (i * 50) - (xAdjust.width / 2), -52);
				}
			}
			
			if (this._entity) {
				arr = this._entity._timeStream;
				
				// Check if we have a time stream and data
				if (arr && arr.length) {
					arrCount = arr.length;
					
					for (i = 0; i < arrCount; i++) {
						arrItem = arr[i];
						
						deltaTime = arrItem[0] - renderTime;
						
						ctx.strokeRect(-105 + ((deltaTime / 10) * 50), -5, 10, 10);
					}
				}
				
				$ige.engine.client.custom2.value = this._entity._timeStreamDataDelta;
				$ige.engine.client.custom3.value = this._entity._timeStreamOffsetDelta;
				$ige.engine.client.custom4.value = this._entity._timeStreamCurrentInterpolateTime;
			}
		}
	});
	
	return IgeUiTimeStream;
});