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
			
			this._draggable = false;
			this._dragging = false;
			
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
				.mount(this._topNav);
			
			this._label.color('#ffffff')
				.value('Window Title');
			
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
				.mouseUp(function () {
					if (!self.emit('beforeClose')) {
						self.destroy();
					}
					
					$ige.engine.input.stopPropagation();
				})
				.mount(this._topNav);
		},
		
		_dragStart: function () {
			var self = this;
			
			if (self._draggable) {
				self._dragging = true;
				self._opStartMouse = $ige.engine._mousePos.clone();
				self._opStartTranslate = {
					x: self._translate.x,
					y: self._translate.y
				};
				
				return true;
			}
		},
		
		_dragMove: function () {
			var self = this,
				curMousePos,
				panCordsX,
				panCordsY,
				panFinalX,
				panFinalY;
			
			if (self._draggable && self._dragging) {
				// Update window co-ordinates
				curMousePos = $ige.engine._mousePos;
				
				panCordsX = self._opStartMouse.x - curMousePos.x;
				panCordsY = self._opStartMouse.y - curMousePos.y;
				
				panFinalX = self._opStartTranslate.x - (panCordsX / $ige._currentViewport.camera._scale.x);
				panFinalY = self._opStartTranslate.y - (panCordsY / $ige._currentViewport.camera._scale.y);
				
				self.style('left', panFinalX);
				self.style('top', panFinalY);
				
				// Cancel further propagation
				return true;
			}
		},
		
		_dragEnd: function () {
			var self = this;
			
			if (self._draggable && self._dragging) {
				self._dragging = false;
				
				// Cancel further propagation
				return true;
			}
		},
		
		draggable: function (val) {
			var self = this;
			
			if (val) {
				self._draggable = true;
				
				this._topNav.on('mouseDown', self._dragStart);
				$ige.engine.input.on('preMouseUp', self._dragEnd);
				$ige.engine.input.on('preMouseMove', self._dragMove);
			} else {
				self._draggable = false;
				
				this._topNav.off('mouseDown', self._dragStart);
				$ige.engine.input.off('preMouseUp', self._dragEnd);
				$ige.engine.input.off('preMouseMove', self._dragMove);
			}
		},
		
		blur: function () {
			IgeUiElement.prototype.blur.call(this);
		},
		
		title: function (val) {
			if (val !== undefined) {
				this._label.value(val);
				return this;
			}
			
			return this._label.value();
		},
		
		titleColor: function (val) {
			if (val !== undefined) {
				this._label.color(val);
				return this;
			}
			
			return this._label.color();
		},
		
		titleFont: function (val) {
			if (val !== undefined) {
				this._label.style('font', val);
				return this;
			}
			
			return this._label.style('font');
		}
	});
	
	return IgeUiWindow;
});