/**
 * Manages audio mixing and output.
 */
var IgeAudioComponent = IgeEventingClass.extend({
	classId: 'IgeAudioComponent',
	componentId: 'audio',
	
	init: function (entity, options) {
		this._active = false;
		this._disabled = false;
		this._ctx = this.getContext();
		
		if (!this._ctx) {
			this.log('No web audio API support, cannot play sounds!', 'warning');
			this._disabled = true;
			return;
		}
		
		this.log('Web audio API connected successfully');
	},

	/**
	 * Gets / sets the active flag to enable or disable audio support.
	 * @param {Boolean=} val True to enable audio support.
	 * @returns {*}
	 */
	active: function (val) {
		if (val !== undefined && !this._disabled) {
			this._active = val;
			return this;
		}
		
		return this._active;
	},

	/**
	 * Returns an audio context.
	 * @returns {*}
	 */
	getContext: function () {
		var ctxProto = window.AudioContext || window.webkitAudioContext;
		
		if (ctxProto) {
			return new ctxProto();
		} else {
			return undefined;
		}
	},

	/**
	 * Loads an audio file from the given url and assigns it the id specified.
	 * @param {String} url The url to load the audio from.
	 * @param {String=} id The id to assign the audio.
	 */
	load: function (url, id) {
		var audio = new IgeAudio(url);
		
		if (id) {
			audio.id(id);
		}
	},

	/**
	 * Decodes audio data and calls back with an audio buffer.
	 * @param {ArrayBuffer} data The audio data to decode.
	 * @param {Function} callback The callback to pass the buffer to.
	 */
	decode: function (data, callback) {
		this._ctx.decodeAudioData(data, function (buffer) {
			callback(false, buffer);
		}, function (err) {
			callback(err);
		});
	},
	
	play: function (id) {
		var audio = ige.$(id);
		if (audio) {
			if (audio.prototype.play) {
				audio.play();
			} else {
				this.log('Trying to play audio with id "" but object with this id is not an IgeAudio instance, or does not implement the .play() method!', 'warnign');
			}
		}
	}
});