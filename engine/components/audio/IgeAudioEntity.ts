"use strict";

var appCore = require('irrelon-appcore'),
	defaultPanner;

// Set default data for any audio panner node
defaultPanner = {
	panningModel: 'HRTF',
	distanceModel: 'inverse',
	refDistance: 100,
	rolloffFactor: 1,
	maxDistance: 10000,
	coneOuterAngle: 360,
	coneInnerAngle: 360,
	coneOuterGain: 0
};

appCore.module('IgeAudioEntity', function ($ige, IgeEntity, IgeAudio) {
	var IgeAudioEntity = IgeEntity.extend({
		classId: 'IgeAudioEntity',
		
		init: function (options) {
			var self = this;
			
			IgeEntity.prototype.init.call(this);
			
			if ($ige.isClient) {
				// Create a new IgeAudio instance that will handle the
				// internals of audio playback for us
				this.audioInterface(new IgeAudio());
				
				// Set some default options
				this._options = {
					started: false,
					relativeTo: undefined,
					panner: defaultPanner,
					gain: 1
				};
				
				// Handle being given an audio id as the second argument
				// instead of an options object
				if (typeof options === 'object') {
					this._options = options;
				} else if (typeof options === 'string') {
					this._options.audioId = options;
					options = undefined;
				}
				
				if (this._options) {
					// Select the audio from the audio register
					this._audioInterface.audioId(this._options.audioId);
					
					if (this._options.relativeTo) {
						this.relativeTo(this._options.relativeTo);
					}
					
					if (this._options.started) {
						// We take this out of process so that there is time
						// to handle other calls that may modify the audio
						// before playback starts
						setTimeout(function () {
							self._audioInterface.play(self._options.loop);
						}, 1);
					}
				}
			}
		},
		
		relativeTo: function (val) {
			var self = this,
				i;
			
			if (val !== undefined) {
				this._relativeTo = val;
				this._listener = $ige.engine.audio._ctx.listener;
				
				// Check if we have a panner node yet or not
				if (!this.audioInterface().panner()) {
					// Create a panner node for the audio output
					this._panner = new PannerNode($ige.engine.audio._ctx, self._options.panner);
					
					// Run through options and apply to panner
					for (i in self._options.panner) {
						if (self._options.panner.hasOwnProperty(i)) {
							this._panner[i] = self._options.panner[i];
						}
					}
					
					this.audioInterface()
						.panner(this._panner);
				}
				
				return this;
			}
			
			return this._relativeTo;
		},
		
		/**
		 * Gets the playing boolean flag state.
		 * @returns {Boolean} True if playing, false if not.
		 */
		playing: function () {
			return this.audioInterface().playing();
		},
		
		/**
		 * Gets / sets the url the audio is playing from.
		 * @param {String} url The url that serves the audio file.
		 * @returns {IgeAudioEntity}
		 */
		url: function (url) {
			if (url !== undefined) {
				this.audioInterface().url(url);
				return this;
			}
			
			return this.audioInterface().url();
		},
		
		/**
		 * Gets / sets the id of the audio stream to use for
		 * playback.
		 * @param {String=} audioId The audio id. Must match
		 * a previously registered audio stream that was
		 * registered via IgeAudioComponent.register(). You can
		 * access the audio component via $ige.engine.audio
		 * once you have added it as a component to use in the
		 * engine.
		 * @returns {*}
		 */
		audioId: function (audioId) {
			if (audioId !== undefined) {
				this.audioInterface()
					.audioId(audioId);
				
				return this;
			}
			
			return this.audioInterface().audioId();
		},
		
		/**
		 * Starts playback of the audio.
		 * @param {Boolean} loop If true, loops the audio until
		 * explicitly stopped by calling stop() or the entity
		 * being destroyed.
		 * @returns {IgeAudioEntity}
		 */
		play: function (loop) {
			this.audioInterface().play(loop);
			return this;
		},
		
		/**
		 * Stops playback of the audio.
		 * @returns {IgeAudioEntity}
		 */
		stop: function () {
			this.audioInterface().stop();
			return this;
		},
		
		/**
		 * Gets / sets the IgeAudio instance used to control
		 * playback of the audio stream.
		 * @param {IgeAudio=} audio
		 * @returns {*}
		 */
		audioInterface: function (audio) {
			if (audio !== undefined) {
				this._audioInterface = audio;
				return this;
			}
			
			return this._audioInterface;
		},
		
		/**
		 * Returns the data sent to each client when the entity
		 * is created via the network stream.
		 * @returns {*}
		 */
		streamCreateData: function () {
			return this._options;
		},
		
		update: function () {
			if (this._relativeTo && this._panner) {
				var audioWorldPos = this.worldPosition(),
					relativeToWorldPos = this._relativeTo.worldPosition();
				
				// Update the audio origin position
				this._panner.setPosition(audioWorldPos.x, -audioWorldPos.y, audioWorldPos.z);
				
				// Update the listener
				this._listener.setPosition(relativeToWorldPos.x, -relativeToWorldPos.y, relativeToWorldPos.z);
			}
			
			IgeEntity.prototype.update.apply(this, arguments);
		},
		
		/**
		 * Called when the entity is to be destroyed. Stops any
		 * current audio stream playback.
		 */
		destroy: function () {
			if ($ige.isClient) {
				this.audioInterface().stop();
			}
			
			IgeEntity.prototype.destroy.call(this);
		}
	});
	
	return IgeAudioEntity;
});