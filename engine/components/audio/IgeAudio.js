"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeAudio', function ($ige, IgeEventingClass) {
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
				if ($ige.engine._register[id]) {
					if ($ige.engine._register[id] === this) {
						// We are already registered as this id
						return this;
					}
					
					// Already an object with this ID!
					this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
				} else {
					// Check if we already have an id assigned
					if (this._id && $ige.engine._register[this._id]) {
						// Unregister the old ID before setting this new one
						$ige.engine.unRegister(this);
					}
					
					this._id = id;
					
					// Now register this object with the object register
					$ige.engine.register(this);
					
					return this;
				}
			}
			
			if (!this._id) {
				// The item has no id so generate one automatically
				if (this._url) {
					// Generate an ID from the URL string of the audio file
					// this instance is using. Useful for always reproducing
					// the same ID for the same file :)
					this._id = $ige.engine.newIdFromString(this._url);
				} else {
					// We don't have a URL so generate a random ID
					this._id = $ige.engine.newIdHex();
				}
				$ige.engine.register(this);
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
			
			self._url = url;
			
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
			
			$ige.engine.audio.decode(self._data, function(err, buffer) {
				if (!err) {
					self._buffer = buffer;
					$ige.engine.audio.log('Audio file (' + self._url + ') loaded successfully');
					
					if (self._playWhenReady) {
						self.play();
					}
					
					if (callback) { callback.apply(self, [false]); }
				} else {
					self.log('Failed to decode audio (' + self._url + '): ' + err, 'warning');
					if (callback) { callback.apply(self, [err]); }
				}
			});
		},
		
		/**
		 * Gets / sets the current audio buffer.
		 * @param buffer
		 * @returns {*}
		 */
		buffer: function (buffer) {
			if (buffer !== undefined) {
				this._buffer = buffer;
				return this;
			}
			
			return this._buffer;
		},
		
		/**
		 * Plays the audio.
		 */
		play: function (loop) {
			var self = this;
			
			if (self._buffer) {
				self._bufferSource = $ige.engine.audio._ctx.createBufferSource();
				self._bufferSource.buffer = self._buffer;
				self._bufferSource.connect($ige.engine.audio._ctx.destination);
				self._bufferSource.loop = loop;
				self._bufferSource.start(0);
				
				self.log('Audio file (' + self._url + ') playing...');
			} else {
				// Wait for a buffer
				this._playWhenReady = true;
				self.log('Audio file (' + self._url + ') waiting to play...');
			}
		},
		
		stop: function () {
			var self = this;
			
			if (self._bufferSource) {
				self.log('Audio file (' + self._url + ') stopping...');
				self._bufferSource.stop();
			} else {
				this._playWhenReady = false;
				self.log('Audio file (' + self._url + ') waiting to stop...');
			}
		}
	});
	
	return IgeAudio;
});