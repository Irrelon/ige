var appCore = require('../../../../ige');

require('./InfoWindow');

appCore.module('MessageWindow', function ($ige, $textures, $game, $time, InfoWindow, IgeUiLabel) {
	var MessageWindow = InfoWindow.extend({
		classId: 'MessageWindow',
		
		init: function (options) {
			var self = this;
			
			InfoWindow.prototype.init.call(this, options);
			
			$ige.engine.network.on('msg', function (data) {
				self.addMsg(data.msg);
			});
			
			this._options = options;
			this._msgs = [];
		},
		
		addMsg: function (msg) {
			this._msgs.push(new IgeUiLabel()
				.layer(1)
				.font(this._options.messageFont || '8px Verdana')
				.height(15)
				.width(this.width())
				.left(0)
				.textAlignX(0)
				.textAlignY(1)
				.textLineSpacing(15)
				.color(this._options.messageColor || '#7bdaf1')
				.value(msg)
				.mount(this)
			);
		},
		
		tick: function (ctx) {
			// Loop children and re-position then
			var arr = this._children,
				arrCount = arr.length, i,
				item, itemY, currentY = 5,
				width;
			
			width = this.width();
			
			for (i = 0; i < arrCount; i++) {
				item = arr[i];
				
				if (item._classId !== 'Tab') {
					itemY = item._bounds2d.y;
					
					item.top(currentY);
					item.width(width);
					
					currentY += itemY;
				}
			}
			
			// Now do the super-class tick
			InfoWindow.prototype.tick.call(this, ctx);
		}
	});
	
	return MessageWindow;
});