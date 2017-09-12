"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeAudioEntity', function ($game, IgeEntity, IgeAudio) {
	var IgeAudioEntity = IgeEntity.extend({
		classId: 'IgeAudioEntity',
		
		init: function (options) {
			IgeEntity.prototype.init.call(this);
			this._options = options;
			
			// Select the audio from the $game.audio object
			// TODO: This should be changed to a global engine-based audio register with each audio file having an id
			this._audioData = $game.audio[options.audioId];
			
			if (this._audioData) {
				this._audio = new IgeAudio();
				this._audio.buffer(this._audioData.buffer());
				
				// TODO: Does this get affected by streaming not sending intial translation?
				// e.g. !this._streamJustCreated ?
				this._audio.play(options.loop);
			}
		},
		
		streamCreateData: function () {
			return this._options;
		},
		
		destroy: function () {
			if (this._audio) {
				this._audio.stop();
				
				delete this._audio;
				delete this._audioData;
			}
			
			IgeEntity.prototype.destroy.call(this);
		}
	});
	
	return IgeAudioEntity;
});