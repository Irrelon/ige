"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeAudio', function ($ige, IgeEventingClass) {
	var IgeAudio = IgeEventingClass.extend({
		classId: 'IgeAudio',
		
		init: function (audioId) {
			this._playing = false;
			
			if (audioId) {
				this.audioId(audioId);
			}
		},
		
		playing: function (val) {
			if (val !== undefined) {
				this._playing = val;
				return this;
			}
			
			return this._playing;
		},
		
		audioId: function (audioId) {
			if (audioId !== undefined) {
				this._audioId = audioId;
				this.buffer($ige.engine.audio.register(audioId));
				
				return this;
			}
			
			return this._audioId;
		},
		
		url: function (url) {
			var self = this;
			
			if (url !== undefined) {
				$ige.engine.audio._load(url, function (err, buffer) {
					if (err || !buffer) {
						return;
					}
					
					self.buffer(buffer);
				});
			}
		},
		
		/**
		 * Gets / sets the current audio buffer.
		 * @param buffer
		 * @returns {*}
		 */
		buffer: function (buffer) {
			if (buffer !== undefined) {
				this._buffer = buffer;
				
				if (this._playWhenReady) {
					this.play(this._loop);
				}
				
				return this;
			}
			
			return this._buffer;
		},
		
		panner: function (val) {
			if (val !== undefined) {
				this._panner = val;
				
				if (this._bufferSource) {
					// Make sure we include the panner in the connections
					this._bufferSource.connect(this._panner);
					this._panner.connect($ige.engine.audio._ctx.destination);
				}
				
				return this;
			}
			
			return this._panner;
		},
		
		/**
		 * Plays the audio.
		 */
		play: function (loop) {
			var self = this;
			
			if (self._buffer) {
				self._bufferSource = $ige.engine.audio._ctx.createBufferSource();
				self._bufferSource.buffer = self._buffer;
				
				if (self._panner) {
					// Connect through the panner
					self._bufferSource.connect(self._panner);
					self._panner.connect($ige.engine.audio._ctx.destination);
				} else {
					// Connect directly to the destination
					self._bufferSource.connect($ige.engine.audio._ctx.destination);
				}
				
				self._bufferSource.loop = loop;
				self._bufferSource.start(0);
				
				self.log('Audio file (' + self._url + ') playing...');
			} else {
				self._playWhenReady = true;
				self._loop = loop;
			}
			
			self._playing = true;
		},
		
		/**
		 * Stops the currently playing audio.
		 */
		stop: function () {
			var self = this;
			
			if (self._bufferSource) {
				self.log('Audio file (' + self._url + ') stopping...');
				self._bufferSource.stop();
			} else {
				self._playWhenReady = false;
			}
			
			self._playing = false;
		}
	});
	
	return IgeAudio;
});