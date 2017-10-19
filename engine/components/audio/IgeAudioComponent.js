"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeAudioComponent', function ($ige, IgeEventingClass) {
	/**
	 * Manages audio mixing and output.
	 */
	var IgeAudioComponent = IgeEventingClass.extend({
		classId: 'IgeAudioComponent',
		componentId: 'audio',
		
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			this._active = false;
			this._disabled = false;
			this._ctx = this.getContext();
			this._register = {};
			
			if (!this._ctx) {
				this.log('No web audio API support, cannot play sounds!', 'warning');
				this._disabled = true;
				return;
			}
			
			this._masterVolumeNode = this._ctx.createGain();
			this._masterVolumeNode.connect(this._ctx.destination);
			
			// Set listener orientation to match our 2d plane
			this._ctx.listener.setOrientation(Math.cos(0.10), 0, Math.sin(0.10), 0, 1, 0);
			
			this.log('Web audio API connected successfully');
		},
		
		/**
		 * Gets / sets the master volume for sound output.
		 * @param val
		 * @returns {*}
		 */
		masterVolume: function (val) {
			if (val !== undefined) {
				this._masterVolumeNode.gain.value = val;
				return this;
			}
			
			return this._masterVolumeNode.gain.value;
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
		 * Gets / loads an audio file from the given url and assigns it the id specified
		 * in the global audio register.
		 * @param {String} id The id to assign the audio in the register.
		 * @param {String=} url The url to load the audio from.
		 */
		register: function (id, url) {
			var self = this;
			
			if (id) {
				if (url) {
					// Assign new audio to register
					self._load(url, function (err, buffer) {
						if (err) {
							return;
						}
						
						self._register[id] = buffer;
					});
					
					return self;
				}
				
				return self._register[id];
			}
			
			return this._register;
		},
		
		/**
		 * Plays audio by its assigned id.
		 * @param {String} id The id of the audio file to play.
		 * @param {Boolean} loop If true, will loop the audio until
		 * it is explicitly stopped.
		 */
		play: function (id, loop) {
			var self = this,
				buffer,
				bufferSource;
			
			if ($ige.isClient) {
				buffer = this.register(id);
				
				if (!buffer) {
					self.log('Audio file (' + id + ') could not play, no buffer exists in register for:' + id, 'warning');
					return;
				}
				
				bufferSource = self._ctx.createBufferSource();
				
				bufferSource.buffer = self.register(id);
				bufferSource.connect(self._masterVolumeNode);
				bufferSource.loop = loop;
				bufferSource.start(0);
				
				self.log('Audio file (' + id + ') playing...');
			}
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
		 * Loads an audio file from the given url.
		 * @param {String} url The url to load the audio file from.
		 * @param {Function=} callback Optional callback method to call when the audio
		 * file has loaded or on error.
		 * @private
		 */
		_load: function (url, callback) {
			var self = this,
				request = new XMLHttpRequest();
			
			request.open('GET', url, true);
			request.responseType = 'arraybuffer';
			
			// Decode asynchronously
			request.onload = function() {
				self._decode(request.response, function(err, buffer) {
					if (!err) {
						self.log('Audio file (' + url + ') loaded successfully');
					} else {
						self.log('Failed to decode audio (' + url + '): ' + err, 'warning');
					}
					
					callback(err, buffer);
				});
			};
			
			request.onerror = function (err) {
				callback(err);
			};
			
			request.send();
		},
		
		/**
		 * Decodes audio data and calls back with an audio buffer.
		 * @param {ArrayBuffer} data The audio data to decode.
		 * @param {Function} callback The callback to pass the buffer to.
		 * @private
		 */
		_decode: function (data, callback) {
			this._ctx.decodeAudioData(data, function (buffer) {
				callback(false, buffer);
			}, function (err) {
				callback(err);
			});
		}
	});
	
	return IgeAudioComponent;
});