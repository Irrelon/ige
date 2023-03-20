var appCore = require('../../../../ige');

appCore.module('Module_Generic', function ($ige, $game, IgeClass, IgeAudioEntity, roundNumber, calculateModifierRatio) {
	var Module_Generic = IgeClass.extend({
		classId: 'Module_Generic',
		
		init: function (definition) {
			this._definition = definition;
			
			// Apply the initial enabled value from the definition
			this._enabled = definition.enabled;
			this._action = definition.action;
			this._active = definition.active !== undefined ? definition.active : false;
			this._target = null;
		},
		
		enabled: function (val) {
			if (val !== undefined) {
				this._enabled = val;
				return this;
			}
			
			return this._enabled;
		},
		
		active: function (val) {
			if (val !== undefined) {
				this._active = val;
				return this;
			}
			
			return this._active;
		},
		
		/**
		 * Gets / sets the entity that this module is attached to.
		 * @param val
		 * @returns {*}
		 */
		attachedTo: function (val) {
			if (val !== undefined) {
				this._attachedTo = val;
				return this;
			}
			
			return this._attachedTo;
		},
		
		target: function (val) {
			if (val !== undefined) {
				this._target = val;
				return this;
			}
			
			return this._target;
		},
		
		action: function (val) {
			if (val !== undefined) {
				this._action = val;
				return this;
			}
			
			return this._action;
		},
		
		/**
		 * If any effects are in the module's definition under "effects"
		 * this method will enable / disable them and add / remove them
		 * to / from the scene.
		 */
		processEffects: function (state) {
			var self = this,
				effectIndex,
				stateEffects,
				sourceEffects;
			
			if (!self._definition.effects || !self._definition.effects[state]) {
				return;
			}
			
			stateEffects = self._definition.effects[state];
			
			// Check and handle any state effects
			if (stateEffects) {
				// Loop the effects and create / destroy them
				sourceEffects = self._attachedTo._effects = self._attachedTo._effects || {};
				
				for (effectIndex = 0; effectIndex < stateEffects.length; effectIndex++) {
					// Create / destroy the effect
					(function (effectIndex) {
						var effectDefinition = stateEffects[effectIndex];
						
						appCore.require(effectDefinition.classId, function (err, EffectClass) {
							var effect,
								effectId;
							
							effectId = self._attachedTo.id() + '_' + self._definition._id + '_' + effectIndex;
							effect = sourceEffects[effectId];
							
							if (effect && effectDefinition.action === 'create' || effectDefinition.action === 'destroy') {
								// Destroy existing effect
								effect.destroy();
								delete sourceEffects[effectId];
							}
							
							if (effectDefinition.action === 'create') {
								effect = new EffectClass(effectDefinition.data);
								effect.id(effectId);
								
								sourceEffects[effectId] = effect;
								
								effect.streamProperty('from', self._attachedTo.id());
								effect.streamProperty('to', self._target.id());
								
								effect.streamMode(1);
								effect.mount($ige.engine.$(effectDefinition.mount));
							}
						});
					})(effectIndex);
				}
			}
		},
		
		/**
		 * If any audio files are in the module's definition under "audio"
		 * this method will enable / disable them.
		 */
		processAudio: function (state) {
			var self = this,
				audioIndex,
				stateAudio,
				sourceAudio;
			
			if (!self._definition.audio || !self._definition.audio[state]) {
				return;
			}
			
			stateAudio = self._definition.audio[state];
			
			// Check and handle any state audio
			if (stateAudio) {
				sourceAudio = self._attachedTo._audio = self._attachedTo._audio || {};
				
				// Loop the audio and create / destroy
				for (audioIndex = 0; audioIndex < stateAudio.length; audioIndex++) {
					// Create / destroy the audio
					(function (effectIndex) {
						var audioDefinition = stateAudio[effectIndex];
						
						switch (audioDefinition.action) {
							case 'play':
								if (audioDefinition.for === 'all') {
									sourceAudio[audioDefinition.audioId] = new IgeAudioEntity(audioDefinition)
										.streamMode(1)
										.mount($ige.engine.$(audioDefinition.mount));
								}
								break;
								
							case 'stop':
								if (!sourceAudio[audioDefinition.audioId]) {
									return;
								}
								
								sourceAudio[audioDefinition.audioId].destroy();
								break;
								
							default:
								break;
						}
					})(audioIndex);
				}
			}
		},
		
		/**
		 * Takes the states in the module's definition for input and output
		 * and based on the tickDelta, calculates the amount of input and
		 * amount of output the module should provide for this tick.
		 * @param {Object} states The current states and their values.
		 * @param {Number} tickDelta The tick delta for this tick.
		 */
		resolve: function (states, tickDelta) {
			var inputId,
				inputValues,
				currentRatio,
				outputId,
				outputValues,
				modifierCalcData;
			
			currentRatio = 1;
			inputValues = {};
			outputValues = {};
			
			if (this.active()) {
				if (this._definition.activeDuration) {
					if ($ige.engine.currentTime() - this._activeStartTime >= this._definition.activeDuration) {
						this.active(false);
						
						// Adjust tick delta to exactly match what is left of the allowed active duration
						tickDelta = tickDelta - (($ige.engine.currentTime() - this._activeStartTime) - this._definition.activeDuration);
						
						this.complete();
					}
				}
			}
			
			if (this._definition.input) {
				for (inputId in this._definition.input) {
					if (this._definition.input.hasOwnProperty(inputId)) {
						switch (inputId) {
							case '$target':
								// Apply state modifier to target entity
								
								break;
							
							default:
								// Calculate maximum modifier value for the tickDelta
								modifierCalcData = calculateModifierRatio(states, this._definition.input[inputId], states[inputId].min, states[inputId].max, tickDelta, inputId);
								
								if (modifierCalcData.ratio < currentRatio) {
									currentRatio = modifierCalcData.ratio;
								}
								
								inputValues[inputId] = modifierCalcData.proposedModifierValue;
								break;
						}
					}
				}
			}
			
			// Now using the worst case ratio from the inputs,
			// calculate each output for this update
			if (this._definition.output) {
				for (outputId in this._definition.output) {
					if (this._definition.output.hasOwnProperty(outputId)) {
						switch (outputId) {
							case '$target':
								// Apply state modifier to target entity
								
								break;
							
							default:
								// Calculate maximum modifier value for the tickDelta
								modifierCalcData = calculateModifierRatio(states, this._definition.output[outputId], states[outputId].min, states[outputId].max, tickDelta, outputId);
								
								if (modifierCalcData.ratio < currentRatio) {
									currentRatio = modifierCalcData.ratio;
								}
								
								outputValues[outputId] = modifierCalcData.proposedModifierValue;
								break;
						}
					}
				}
			}
			
			// Now loop the input values and apply the lowest ratio to them
			for (inputId in inputValues) {
				if (inputValues.hasOwnProperty(inputId)) {
					// Assign the new state value
					states[inputId].val = roundNumber(states[inputId].val + (inputValues[inputId] * currentRatio), 6);
				}
			}
			
			for (outputId in outputValues) {
				if (outputValues.hasOwnProperty(outputId)) {
					// Assign the new state value
					states[outputId].val = roundNumber(states[outputId].val + (outputValues[outputId] * currentRatio), 6);
				}
			}
		}
	});
	
	return Module_Generic;
});