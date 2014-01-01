var IgeAudio = IgeEventingClass.extend({
	classId: 'IgeAudio',
	
	init: function (url) {
		if (url) {
			this.load(url);
		}
	},
	
	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id The id to set to.
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			// Check if this ID already exists in the object register
			if (ige._register[id]) {
				if (ige._register[id] === this) {
					// We are already registered as this id
					return this;
				}
				
				// Already an object with this ID!
				this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
			} else {
				// Check if we already have an id assigned
				if (this._id && ige._register[this._id]) {
					// Unregister the old ID before setting this new one
					ige.unRegister(this);
				}

				this._id = id;

				// Now register this object with the object register
				ige.register(this);

				return this;
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			if (this._url) {
				// Generate an ID from the URL string of the audio file
				// this instance is using. Useful for always reproducing
				// the same ID for the same file :)
				this._id = ige.newIdFromString(this._url);
			} else {
				// We don't have a URL so generate a random ID
				this._id = ige.newIdHex();
			}
			ige.register(this);
		}

		return this._id;
	},

	/**
	 * Loads an audio file from the given url.
	 * @param {String} url The url to load the audio file from.
	 * @param {Function=} callback Optional callback method to call when the audio
	 * file has loaded or on error.
	 */
	load: function (url, callback) {
		var self = this,
			request = new XMLHttpRequest();
		
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		
		// Decode asynchronously
		request.onload = function() {
			self._data = request.response;
			self._url = url;
			self._loaded(callback);
		};
		
		request.onerror = function (err) {
			callback.apply(self, [err]);
		};
		
		request.send();
	},
	
	_loaded: function (callback) {
		var self = this;
		
		ige.audio.decode(self._data, function(err, buffer) {
			if (!err) {
				self._buffer = buffer;
				ige.audio.log('Audio file (' + self._url + ') loaded successfully');
				
				if (callback) { callback.apply(self, [false]); }
			} else {
				self.log('Failed to decode audio data from: ' + self._url, 'warning');
				if (callback) { callback.apply(self, [err]); }
			}
		});
	},

	/**
	 * Plays the audio.
	 */
	play: function () {
		var self = this,
			bufferSource;
		
		if (self._buffer) {
			bufferSource = ige.audio._ctx.createBufferSource();
			bufferSource.buffer = self._buffer;
			bufferSource.connect(ige.audio._ctx.destination);
			bufferSource.start(0);
		}
	}
});