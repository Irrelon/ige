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
	 * @param {String=} id
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
	
	load: function (url) {
		var self = this,
			request = new XMLHttpRequest();
		
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		
		// Decode asynchronously
		request.onload = function() {
			self._data = request.response;
			self._url = url;
			self._loaded();
		};
		
		request.send();
	},
	
	_loaded: function () {
		var self = this;
		
		ige.audio.decode(self._data, function(err, buffer) {
			if (!err) {
				self._buffer = buffer;
				self._bufferSource = ige.audio._ctx.createBufferSource();
				self._bufferSource.buffer = buffer;
				self._bufferSource.connect(ige.audio._ctx.destination);
				
				ige.audio.log('Audio file (' + self._url + ') loaded successfully')
			} else {
				self.log('Failed to decode audio data from: ' + self._url, 'warning');
			}
		});
	},
	
	play: function () {
		if (this._bufferSource) {
			this._bufferSource.start(0);
		}
	}
});