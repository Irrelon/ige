// TODO: Document this class
var IgeUiProgressBar = IgeUiEntity.extend({
	init: function () {
		this._super();

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

	progess: function (val) {
		if (val !== undefined) {
			this._progress = val;
			return this;
		}

		return this._progress;
	},

	render: function (ctx) {
		var min = this._min,
			max = this._max,
			progress = this._progress,
			interval = this.geometry.x / (max - min),
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
			ctx.fillRect(-this.geometry.x2, -this.geometry.y2, this.geometry.x, this.geometry.y);
		}

		// Draw bar
		if (this._barColor) {
			ctx.fillStyle = this._barColor;
			ctx.fillRect(-this.geometry.x2, -this.geometry.y2, barWidth, this.geometry.y);
		}

		// Draw bar border
		if (this._barBorderColor) {
			ctx.strokeStyle = this._barBorderColor;
			ctx.strokeRect(-this.geometry.x2, -this.geometry.y2, this.geometry.x, this.geometry.y);
		}

		// Draw bar text centered
		if (this._barText) {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			ctx.fillStyle = this._barText.color;
			ctx.fillText(this._barText.pre + String(progress.val) + this._barText.post, 0, 0);
		}
	},

	tick: function (ctx) {
		this._transformContext(ctx);
		this.render(ctx);
		this._super(ctx, true);
	}
});