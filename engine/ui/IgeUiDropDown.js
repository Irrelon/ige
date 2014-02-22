var IgeUiDropDown = IgeUiElement.extend({
	classId: 'IgeUiDropDown',
	
	init: function () {
		var self = this;
		
		IgeUiElement.prototype.init.call(this);
		
		// Define some default styles
		if (!ige.ui.style('.IgeUiDropDownOption')) {
			ige.ui.style('.IgeUiDropDownOption', {
				backgroundColor: null
			});
			
			ige.ui.style('.IgeUiDropDownOption:hover', {
				backgroundColor: '#00b4ff',
				color: '#ffffff'
			});
		}
		
		// Set defaults
		this.borderColor('#000000');
		this.borderWidth(1);
		this.backgroundColor('#ffffff');
		this.color('#000000');
		this.width(200);
		this.height(30);
		
		this._options = [];
		this._toggleState = false;
		
		this._label = new IgeUiLabel()
			.left(0)
			.right(30)
			.top(0)
			.bottom(0)
			.mount(this);
		
		this.on('mouseUp', function () {
			// Toggle the list drop-down
			self.toggle();
		});
	},
	
	options: function (ops) {
		if (ops !== undefined) {
			this._options = ops;
			
			// Loop the options and check for a selected one
			var arrCount = ops.length;
			
			while (arrCount--) {
				if (ops[arrCount].selected) {
					// Set this option as selected
					this.selectIndex(arrCount);
					return this;
				}
			}
			
			// No item selected, select the first option
			this.selectIndex(0);
			
			return this;
		}
		
		return this;
	},
	
	addOption: function (op) {
		if (op !== undefined) {
			this._options.push(op);
			
			if (op.selected) {
				// Set this option as selected
				this.selectIndex(this._options.length - 1);
				return this;
			}
			
			// No item selected, select the first option
			this.selectIndex(0);
			
			return this;
		}
		
		return this;
	},
	
	removeAllOptions: function () {
		this._options = [];
		this.value({
			text: '',
			value: ''
		});
	},
	
	blur: function () {
		IgeUiElement.prototype.blur.call(this);
		if (this._toggleState) {
			this.toggle();
		}
	},
	
	selectIndex: function (index) {
		if (this._options[index]) {
			this.value(this._options[index]);
			this.emit('change', this.value());
		}
	},
	
	value: function (val) {
		if (val !== undefined) {
			IgeUiElement.prototype.value.call(this, val);
			this._label.value(val.text);
			return this;
		}
		
		return this._value.value;
	},

	toggle: function () {
		this._toggleState = !this._toggleState;
		
		if (this._toggleState) {
			var self = this,
				optionContainer,
				mainTop = this._bounds2d.y + 5,
				mainHeight = this._options.length * 30,
				optionTop = 0,
				i;
			
			optionContainer =new IgeUiElement()
				.id(this._id + '_options')
				.backgroundColor(this._backgroundColor)
				.borderColor(this._borderColor)
				.borderWidth(this._borderWidth)
				.top(mainTop)
				.width(this._bounds2d.x)
				.height(mainHeight)
				.mount(this);
			
			for (i = 0; i < this._options.length; i++) {
				ige.ui.style('#' + this._id + '_options_' + i, {
					color: this._color
				});
				
				new IgeUiLabel()
					.id(this._id + '_options_' + i)
					.data('optionIndex', i)
					.styleClass('IgeUiDropDownOption')
					.value(this._options[i].text)
					.top((this._bounds2d.y * i) + 1)
					.left(1)
					.width(this._bounds2d.x - 2)
					.height(this._bounds2d.y - 2)
					.allowFocus(true)
					.allowActive(true)
					.allowHover(true)
					.mouseUp(function () {
						self.selectIndex(this.data('optionIndex'));
					})
					.mount(optionContainer);
			} 
		} else {
			ige.$(this._id + '_options').destroy();
		}
	},
	
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiDropDown; }