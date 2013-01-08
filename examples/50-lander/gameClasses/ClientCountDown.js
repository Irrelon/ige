var ClientCountDown = IgeFontEntity.extend({
	classId: 'ClientCountDown',

	init: function (prefix, countdownFrom, sufix, interval) {
		IgeFontEntity.prototype.init.call(this);

		this._prefix = prefix || '';
		this._countdown = countdownFrom;
		this._count = countdownFrom;
		this._sufix = sufix || '';
		this._interval = interval || 1000;

		this.depth(1)
			.width(480)
			.height(110)
			.texture(ige.client.textures.font)
			.textAlignX(1)
			.textLineSpacing(0)
			.text(this._prefix + this._count + this._sufix);
	},

	start: function () {
		var self = this;
		this._intervalTimer = setInterval(function () { self._timerTick(); }, this._interval);

		return this;
	},

	_timerTick: function () {
		this._count--;
		this.text(this._prefix + this._count + this._sufix);

		if (this._count === 0) {
			this.emit('complete');
			this.stop();
		}

		return this;
	},

	stop: function () {
		clearInterval(this._intervalTimer);
		return this;
	}
});