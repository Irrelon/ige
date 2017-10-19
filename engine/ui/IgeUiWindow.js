var appCore = require('irrelon-appcore');

appCore.module('IgeUiWindow', function ($ige, IgeUiElement, IgeUiLabel, IgeUiButton) {
	var IgeUiWindow = IgeUiElement.extend({
		classId: 'IgeUiWindow',
		
		init: function () {
			var self = this;
			
			IgeUiElement.prototype.init.call(this);
			
			// Define some default styles
			if (!$ige.engine.ui.style('IgeUiWindow')) {
				$ige.engine.ui.style('IgeUiWindow', {
					backgroundColor: null
				});
			}
			
			// Set defaults
			this.borderColor('#000000');
			this.borderWidth(1);
			this.backgroundColor('#ffffff');
			this.color('#000000');
			this.width(200);
			this.height(30);
			
			this._topNav = new IgeUiElement()
				.backgroundColor('#212121')
				.top(0)
				.left(0)
				.right(0)
				.height(42)
				.mount(this);
			
			this._label = new IgeUiLabel()
				.left(0)
				.top(0)
				.right(0)
				.bottom(0)
				.paddingLeft(5)
				.textAlignY(1)
				.color('#ffffff')
				.mount(this._topNav);
			
			this._closeButton = new IgeUiButton()
				.backgroundColor('#cccccc')
				.borderColor('#000000')
				.borderWidth(1)
				.width(26)
				.height(26)
				.right(8)
				.top(8)
				.value('X')
				.color('#000000')
				.mount(this._topNav);
			
			this.on('mouseUp', function () {
			
			});
		},
		
		blur: function () {
			IgeUiElement.prototype.blur.call(this);
		},
		
		title: function (val) {
			if (val !== undefined) {
				this._label.value(val.text);
				return this;
			}
			
			return this._label.value();
		}/*,
		
		tick: function (ctx) {
			IgeUiElement.prototype.tick.call(this, ctx);
			
			// Draw drop-down box
			ctx.fillStyle = '#cccccc';
			ctx.fillRect(Math.floor(this._bounds2d.x2) - 30, -this._bounds2d.y2 + 1, 30, this._bounds2d.y - 2);
			
			// Chevron
			ctx.strokeStyle = this._color;
			ctx.beginPath();
			ctx.moveTo(this._bounds2d.x2 - 18.5, -this._bounds2d.y2 + 14.5);
			ctx.lineTo(this._bounds2d.x2 - 14.5, 2.5);
			ctx.lineTo(this._bounds2d.x2 - 10.5, -this._bounds2d.y2 + 14.5);
			ctx.stroke();
			
			this._renderBorder(ctx);
		}*/
	});
	
	return IgeUiWindow;
});