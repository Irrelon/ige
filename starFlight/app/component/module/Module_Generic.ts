import { ige } from "@/engine/instance";
import { igeClassStore, registerClass } from "@/engine/igeClassStore";
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { calculateModifierRatio, roundNumber } from "../../services";
import { IgeAudioEntity } from "@/engine/audio";
import {
	EntityModuleDefinition, EntityModuleAudio,
	EntityModuleEffectAction,
	EntityModuleEffects, EntityModuleStates
} from "../../../types/EntityModuleDefinition";

export class Module_Generic extends IgeBaseClass {
	classId = "Module_Generic";
	_definition: EntityModuleDefinition;
	_enabled: boolean = false;
	_active: boolean = false;
	//_target: IgeEntity | null = null;

	_activeStartTime: number = 0;
	_attachedTo: IgeEntity | null = null;// This might be GameEntity and game entity requires _effects defined on it, and effects need their own class

	constructor (definition: EntityModuleDefinition) {
		super();
		this._definition = definition;

		// Apply the initial enabled value from the definition
		this._enabled = definition.enabled;
		this._active = definition.active !== undefined ? definition.active : false;
	}

	enabled (val?: boolean) {
		if (val !== undefined) {
			this._enabled = val;
			return this;
		}

		return this._enabled;
	}

	active (val?: boolean) {
		if (val !== undefined) {
			this._active = val;
			return this;
		}

		return this._active;
	}

	/**
	 * Gets / sets the entity that this module is attached to.
	 * @param val
	 * @returns {*}
	 */
	attachedTo (val?: IgeEntity) {
		if (val !== undefined) {
			this._attachedTo = val;
			return this;
		}

		return this._attachedTo;
	}

	/**
	 * If any effects are in the module's definition under "effects"
	 * this method will enable / disable them and add / remove them
	 * to / from the scene.
	 */
	processEffects (state: keyof EntityModuleEffects) {
		if (!this._definition.effects || !this._definition.effects[state]) {
			return;
		}

		if (!this._attachedTo || !this._target) return;

		const stateEffects: EntityModuleEffectAction[] | undefined = this._definition.effects[state];

		// Check and handle any state effects
		if (stateEffects) {
			// Loop the effects and create / destroy them
			const sourceEffects = this._attachedTo._effects = this._attachedTo._effects || {};

			for (let effectIndex = 0; effectIndex < stateEffects.length; effectIndex++) {
				// Create / destroy the effect
				const effectDefinition = stateEffects[effectIndex];

				const EffectClass = igeClassStore[effectDefinition.classId];

				let effect;

				const effectId = this._attachedTo.id() + "_" + this._definition._id + "_" + effectIndex;
				effect = sourceEffects[effectId];

				if (effect && effectDefinition.action === "create" || effectDefinition.action === "destroy") {
					// Destroy existing effect
					effect.destroy();
					delete sourceEffects[effectId];
				}

				if (effectDefinition.action === "create") {
					effect = new EffectClass(effectDefinition.data);
					effect.id(effectId);

					sourceEffects[effectId] = effect;

					effect.streamProperty("from", this._attachedTo.id());
					effect.streamProperty("to", this._target.id());

					effect.streamMode(1);
					effect.mount(ige.$(effectDefinition.mount));
				}
			}
		}
	}

	/**
	 * If any audio files are in the module's definition under "audio"
	 * this method will enable / disable them.
	 */
	processAudio (state: keyof EntityModuleAudio) {
		if (!this._definition.audio || !this._definition.audio[state]) {
			return;
		}

		const stateAudio = this._definition.audio[state];

		// Check and handle any state audio
		if (stateAudio) {
			const sourceAudio = this._attachedTo._audio = this._attachedTo._audio || {};

			// Loop the audio and create / destroy
			for (let audioIndex = 0; audioIndex < stateAudio.length; audioIndex++) {
				// Create / destroy the audio
				(function (effectIndex) {
					const audioDefinition = stateAudio[effectIndex];

					switch (audioDefinition.action) {
					case "play":
						if (audioDefinition.for === "all") {
							sourceAudio[audioDefinition.audioId] = new IgeAudioEntity(audioDefinition.audioId, {loop: audioDefinition.loop})
								.streamMode(1)
								.mount(ige.$(audioDefinition.mount) as IgeEntity);
						}
						break;

					case "stop":
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
	}

	/**
	 * Takes the states in the module's definition for input and output
	 * and based on the tickDelta, calculates the amount of input and
	 * amount of output the module should provide for this tick.
	 * @param {Object} states The current states and their values.
	 * @param {Number} tickDelta The tick delta for this tick.
	 */
	resolve (states: EntityModuleStates, tickDelta: number) {
		let currentRatio = 1;

		const inputValues = {};
		const outputValues = {};

		if (this._definition.input) {
			for (const inputId in this._definition.input) {
				if (this._definition.input.hasOwnProperty(inputId)) {
					switch (inputId) {
					case "$target":
						// Apply state modifier to target entity

						break;

					default:
						// Calculate maximum modifier value for the tickDelta
						const modifierCalcData = calculateModifierRatio(states, this._definition.input[inputId], states[inputId].min, states[inputId].max, tickDelta, inputId);

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
			for (const outputId in this._definition.output) {
				if (this._definition.output.hasOwnProperty(outputId)) {
					switch (outputId) {
					case "$target":
						// Apply state modifier to target entity

						break;

					default:
						// Calculate maximum modifier value for the tickDelta
						const modifierCalcData = calculateModifierRatio(states, this._definition.output[outputId], states[outputId].min, states[outputId].max, tickDelta, outputId);

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
		for (const inputId in inputValues) {
			if (inputValues.hasOwnProperty(inputId)) {
				// Assign the new state value
				states[inputId].val = roundNumber(states[inputId].val + (inputValues[inputId] * currentRatio), 6);
			}
		}

		for (const outputId in outputValues) {
			if (outputValues.hasOwnProperty(outputId)) {
				// Assign the new state value
				states[outputId].val = roundNumber(states[outputId].val + (outputValues[outputId] * currentRatio), 6);
			}
		}
	}

	complete () {}

	cooldown (): boolean {
		return false;
	}

	canBeActive (states: EntityModuleStates): boolean {
		return true;
	}
}

registerClass(Module_Generic);
