var appCore = require('irrelon-appcore');

appCore.module('IgeUiProgressBar', function (IgeUiElement) {
	// TODO: Document this class
	var IgeUiProgressBar = IgeUiElement.extend({
		classId: 'IgeUiProgressBar',
		
		init: function () {
			IgeUiElement.prototype.init.call(this);
			
			// Set some defaults
			this._min = 0;
			this._max = 100;
			this._progress = 0;
			this._barColor = '#fff600';
			this._barText = {
				pre: '',
				post: '',
				color: ''
			};
		},
		
		barBackColor: function (val) {
			if (val !== undefined) {
				this._barBackColor = val;
				return this;
			}
			
			return this._barBackColor;
		},
		
		barColor: function (val) {
			if (val !== undefined) {
				this._barColor = val;
				return this;
			}
			
			return this._barColor;
		},
		
		barBorderColor: function (val) {
			if (val !== undefined) {
				this._barBorderColor = val;
				return this;
			}
			
			return this._barBorderColor;
		},
		
		barText: function (pre, post, color, percent) {
			if (typeof post === 'function') {
				this._barText = {
					color: pre,
					func: post,
					pre: this._barText.pre,
					post: this._barText.post
				};
				
				return this;
			}
			
			if (pre !== undefined && post !== undefined && color !== undefined) {
				this._barText = {
					pre: pre,
					post: post,
					color: color,
					percent: percent !== undefined ? percent : false
				};
				
				return this;
			}
			
			return this._barText;
		},
		
		min: function (val) {
			if (val !== undefined) {
				this._min = val;
				return this;
			}
			
			return this._min;
		},
		
		max: function (val) {
			if (val !== undefined) {
				this._max = val;
				return this;
			}
			
			return this._max;
		},
		
		progress: function (val) {
			if (val !== undefined) {
				if (val < this._min) {
					val = this._min;
				}
				
				if (val > this._max) {
					val = this._max;
				}
				
				this._progress = val;
				return this;
			}
			
			return this._progress;
		},
		
		bindData: function (obj, propName) {
			if (obj !== undefined && propName !== undefined) {
				// Set the object and property to automatically
				// track progress from
				this._bindDataObject = obj;
				this._bindDataProperty = propName;
			}
			
			return this;
		},
		
		render: function (ctx) {
			// Check for an auto-progress update
			if (this._bindDataObject && this._bindDataProperty) {
				if (this._bindDataObject._alive === false) {
					// The object we have bind data from has been
					// destroyed so release our reference to it!
					delete this._bindDataObject;
				} else {
					this.progress(parseInt(this._bindDataObject[this._bindDataProperty]));
				}
			}
			
			var min = this._min,
				max = this._max,
				progress = this._progress,
				interval = this._bounds2d.x / (max - min),
				barWidth = (progress - min) * interval,
				valText;
			
			// Check the value is not out of range
			if (progress > max) {
				progress = max;
			}
			
			if (progress < min) {
				progress = min;
			}
			
			// Draw bar fill
			if (this._barBackColor) {
				ctx.fillStyle = this._barBackColor;
				ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
			}
			
			// Draw bar
			if (this._barColor) {
				ctx.fillStyle = this._barColor;
				ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, barWidth, this._bounds2d.y);
			}
			
			// Draw bar border
			if (this._barBorderColor) {
				ctx.strokeStyle = this._barBorderColor;
				ctx.strokeRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
			}
			
			// Draw bar text centered
			if (this._barText) {
				if (this._barText.func) {
					// Custom formatting function
					valText = this._barText.func(progress, max);
				} else if (this._barText.pre || this._barText.post) {
					if (this._barText.percent) {
						valText = String(Math.floor((100 / max) * progress));
					} else {
						valText = String(Math.floor(progress));
					}
				}
			}
			
			if (valText) {
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				
				ctx.fillStyle = this._barText.color;
				ctx.fillText(this._barText.pre + valText + this._barText.post, 0, 0);
			}
		},
		
		tick: function (ctx) {
			this._transformContext(ctx);
			this.render(ctx);
			IgeUiElement.prototype.tick.call(this, ctx, true);
		}
	});
	
	return IgeUiProgressBar;
});