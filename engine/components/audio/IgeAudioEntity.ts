import { ige } from "../../instance";
import IgeEntity from "../../core/IgeEntity";
import IgeAudio from "./IgeAudio";
import { isClient } from "../../services/clientServer";

export interface IgeAudioEntityPanner {
	panningModel: string;
	distanceModel: string;
	refDistance: number;
	rolloffFactor: number;
	maxDistance: number;
	coneOuterAngle: number;
	coneInnerAngle: number;
	coneOuterGain: number;
}

export interface IgeAudioEntityOptions {
	started: boolean;
	loop: boolean;
	gain: number;
	panner: IgeAudioEntityPanner;
	relativeTo?: IgeEntity;
}

// Set default data for any audio panner node
const defaultPanner = {
	panningModel: "HRTF",
	distanceModel: "inverse",
	refDistance: 100,
	rolloffFactor: 1,
	maxDistance: 10000,
	coneOuterAngle: 360,
	coneInnerAngle: 360,
	coneOuterGain: 0
};

class IgeAudioEntity extends IgeEntity {
	classId = "IgeAudioEntity";
	_audioInterface?: IgeAudio;
	_options: IgeAudioEntityOptions = {
		started: false,
		loop: false,
		gain: 1,
		panner: defaultPanner
	};
	_relativeTo?: IgeEntity;
	_listener?: AudioListener;

	constructor (audioId: string, options?: IgeAudioEntityOptions);
	constructor (audioId?: string, options: IgeAudioEntityOptions = {
		started: false,
		loop: false,
		gain: 1,
		panner: defaultPanner
	}) {
		super();

		if (!isClient) {
			return;
		}

		this._audioInterface = new IgeAudio(audioId);
		this._options = options;

		if (this._options.relativeTo) {
			this.relativeTo(this._options.relativeTo);
		}

		if (this._options.started) {
			// We take this out of process so that there is time
			// to handle other calls that may modify the audio
			// before playback starts
			setTimeout(() => {
				if (!this._audioInterface) return;
				this._audioInterface.play(this._options.loop);
			}, 1);
		}
	}

	relativeTo (val: IgeEntity): this;
	relativeTo (): IgeEntity | undefined;
	relativeTo (val?: IgeEntity) {
		if (val !== undefined) {
			const audioInterface = this.audioInterface();
			if (!audioInterface) return;

			this._relativeTo = val;
			this._listener = ige.audio._ctx.listener;

			// Check if we have a panner node yet or not
			if (!audioInterface.panner()) {
				// Create a panner node for the audio output
				this._panner = new PannerNode(ige.engine.audio._ctx, self._options.panner);

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
	}

	/**
	 * Gets the playing boolean flag state.
	 * @returns {Boolean} True if playing, false if not.
	 */
	playing () {
		return this.audioInterface().playing();
	}

	/**
	 * Gets / sets the url the audio is playing from.
	 * @param {String} url The url that serves the audio file.
	 * @returns {IgeAudioEntity}
	 */
	url (url) {
		if (url !== undefined) {
			this.audioInterface().url(url);
			return this;
		}

		return this.audioInterface().url();
	}

	/**
	 * Gets / sets the id of the audio stream to use for
	 * playback.
	 * @param {String=} audioId The audio id. Must match
	 * a previously registered audio stream that was
	 * registered via IgeAudioComponent.register(). You can
	 * access the audio component via ige.engine.audio
	 * once you have added it as a component to use in the
	 * engine.
	 * @returns {*}
	 */
	audioId (audioId) {
		if (audioId !== undefined) {
			this.audioInterface()
				.audioId(audioId);

			return this;
		}

		return this.audioInterface().audioId();
	}

	/**
	 * Starts playback of the audio.
	 * @param {Boolean} loop If true, loops the audio until
	 * explicitly stopped by calling stop() or the entity
	 * being destroyed.
	 * @returns {IgeAudioEntity}
	 */
	play (loop) {
		this.audioInterface().play(loop);
		return this;
	}

	/**
	 * Stops playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	stop () {
		this.audioInterface().stop();
		return this;
	}

	/**
	 * Gets / sets the IgeAudio instance used to control
	 * playback of the audio stream.
	 * @param {IgeAudio=} audio
	 * @returns {*}
	 */
	audioInterface (audio: IgeAudio): this;
	audioInterface (): IgeAudio | undefined;
	audioInterface (audio?: IgeAudio) {
		if (audio !== undefined) {
			this._audioInterface = audio;
			return this;
		}

		return this._audioInterface;
	}

	/**
	 * Returns the data sent to each client when the entity
	 * is created via the network stream.
	 * @returns {*}
	 */
	streamCreateData () {
		return this._options;
	}

	update () {
		if (this._relativeTo && this._panner) {
			const audioWorldPos = this.worldPosition(),
				relativeToWorldPos = this._relativeTo.worldPosition();

			// Update the audio origin position
			this._panner.setPosition(audioWorldPos.x, -audioWorldPos.y, audioWorldPos.z);

			// Update the listener
			this._listener.setPosition(relativeToWorldPos.x, -relativeToWorldPos.y, relativeToWorldPos.z);
		}

		IgeEntity.prototype.update.apply(this, arguments);
	}

	/**
	 * Called when the entity is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		if (isClient) {
			this.audioInterface().stop();
		}

		IgeEntity.prototype.destroy.call(this);
	}
}
