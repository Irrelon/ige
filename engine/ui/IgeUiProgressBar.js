// TODO: Document this class
var IgeUiProgressBar = IgeUiEntity.extend({
	classId: 'IgeUiProgressBar',

	init: function () {
		IgeUiEntity.prototype.init.call(this);

		// Set some defaults
		this._min = 0;
		this._max = 100;
		this._progress = 0;
		this._barBackColor = '#000000';
		this._barColor = '#fff600';
		this._barBorderColor = '#ffffff';
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

	barText: function (pre, post, color) {
		if (pre !== undefined && post !== undefined && color !== undefined) {
			this._barText = {
				pre: pre,
				post: post,
				color: color
			};
			return this;
		}

		return this._barText;
	},

	max: function (val) {
		if (val !== undefined) {
			this._max = val;
			return this;
		}

		return this._max;
	},

	min: function (val) {
		if (val !== undefined) {
			this._min = val;
			return this;
		}

		return this._min;
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
			interval = this._geometry.x / (max - min),
			barWidth = (progress - min) * interval;

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
			ctx.fillRect(-this._geometry.x2, -this._geometry.y2, this._geometry.x, this._geometry.y);
		}

		// Draw bar
		if (this._barColor) {
			ctx.fillStyle = this._barColor;
			ctx.fillRect(-this._geometry.x2, -this._geometry.y2, barWidth, this._geometry.y);
		}

		// Draw bar border
		if (this._barBorderColor) {
			ctx.strokeStyle = this._barBorderColor;
			ctx.strokeRect(-this._geometry.x2, -this._geometry.y2, this._geometry.x, this._geometry.y);
		}

		// Draw bar text centered
		if (this._barText && (this._barText.pre || this._barText.post)) {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			ctx.fillStyle = this._barText.color;
			ctx.fillText(this._barText.pre + String(Math.floor(progress)) + this._barText.post, 0, 0);
		}
	},

	tick: function (ctx) {
		this._transformContext(ctx);
		this.render(ctx);
		IgeUiEntity.prototype.tick.call(this, ctx, true);
	}
});