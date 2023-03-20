var appCore = require('../../../../ige');

require('./Tab');

appCore.module('InfoWindow', function ($ige, $textures, $game, $time, IgeUiEntity, IgeEntity, IgeUiButton, IgeUiLabel, Tab) {
	var InfoWindow = IgeUiEntity.extend({
		classId: 'InfoWindow',
		
		init: function (options) {
			var self = this;
			
			IgeUiEntity.prototype.init.call(this);
			
			if (options.label) {
				this._label = new IgeUiLabel()
					.layer(1)
					.font(options.labelFont || '8px Verdana')
					.height(12)
					.width(100)
					.left(0)
					.top(5)
					.textAlignX(0)
					.textAlignY(1)
					.textLineSpacing(12)
					.color('#7bdaf1')
					.value(options.label)
					.mount(this);
			}
			
			if (options.tab) {
				// Create toggle tab for the window
				this._tab = new Tab(options.tab)
					.mount(this);
			}
			
			this.texture($textures.get('infoWindow'));
			this.windowGradient("#04b7f9", "#005066", "#04b7f9");
		},
		
		show: function () {
			IgeUiEntity.prototype.show.call(this);
			
			if (this._label) {
				this._label.width(this.width());
			}
			
			this.windowGradient("#04b7f9", "#005066", "#04b7f9");
		},
		
		windowGradient: function (color1, color2, color3) {
			this._windowGradient = $ige.engine._ctx.createLinearGradient(0, 0, this.width(), this.height());
			this._windowGradient.addColorStop(0.0, color1);
			this._windowGradient.addColorStop(0.5, color2);
			this._windowGradient.addColorStop(1.0, color3);
		}
	});
	
	return InfoWindow;
});