import IgeEntity from "../../core/IgeEntity";
import IgeComponent from "../../core/IgeComponent";
import IgeAudio from "./IgeAudio";
import { ige } from "../../instance";

/**
 * Manages audio mixing and output.
 */
class IgeAudioComponent<TargetClass extends IgeEntity = IgeEntity> extends IgeComponent<TargetClass> {
	classId = "IgeAudioComponent";
	componentId = "audio";
	_active: boolean;
	_disabled: boolean;
	_ctx: AudioContext;

	constructor (entity: TargetClass, options?: any) {
		super(entity, options);

		this._active = false;
		this._disabled = false;
		this._ctx = this.getAudioContext();

		if (!this._ctx) {
			this.log("No web audio API support, cannot play sounds!", "warning");
			this._disabled = true;
			return;
		}

		this.log("Web audio API connected successfully");
	}

	/**
	 * Gets / sets the active flag to enable or disable audio support.
	 * @param {Boolean=} val True to enable audio support.
	 * @returns {*}
	 */
	active = (val?: boolean) => {
		if (val !== undefined && !this._disabled) {
			this._active = val;
			return this;
		}

		return this._active;
	}

	/**
	 * Returns an audio context.
	 * @returns {*}
	 */
	getAudioContext () {
		return new window.AudioContext();
	}

	/**
	 * Loads an audio file from the given url and assigns it the id specified.
	 * @param {String} url The url to load the audio from.
	 * @param {String=} id The id to assign the audio.
	 */
	load = (url: string, id: string) => {
		const audio = new IgeAudio(url);

		if (id) {
			audio.id(id);
		}
	}

	/**
	 * Decodes audio data and calls back with an audio buffer.
	 * @param {ArrayBuffer} data The audio data to decode.
	 */
	decode = async (data: ArrayBuffer): Promise<AudioBuffer> => {
		return this._ctx.decodeAudioData(data);
	}

	play = (id: string) => {
		const audio = ige.$(id) as IgeAudio;

		if (!audio || !audio.play) {
			throw new Error(`Trying to play audio with id "${id}" but object with this id is not an IgeAudio instance, or does not implement the .play() method!`);
		}

		audio.play();
	}
}

export default IgeAudioComponent;
