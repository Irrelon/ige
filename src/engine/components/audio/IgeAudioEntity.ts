import { IgeAudioControl } from "@/engine/components/audio/IgeAudioControl";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { isClient } from "@/engine/utils/clientServer";
import { registerClass } from "@/engine/utils/igeClassStore";
import type { IgeAudioPlaybackOptions } from "@/types/IgeAudioPlaybackOptions";

export interface IgeAudioEntityPanner extends PannerOptions {
}

// Set default data for any audio panner node
export const defaultPannerSettings: IgeAudioEntityPanner = {
	panningModel: "HRTF",
	distanceModel: "inverse",
	refDistance: 100,
	rolloffFactor: 1,
	maxDistance: 10000,
	coneOuterAngle: 360,
	coneInnerAngle: 360,
	coneOuterGain: 0
};

export interface IgeAudioEntityProps extends IgeAudioPlaybackOptions {
	audioId?: string;
	playing?: boolean;
}

/**
 * Creates an audio entity that automatically handles
 * controlling panning / positioning of sound based on
 * where it is located on the screen in relation to
 * the listener / player. Also supports entity streaming
 * so an IgeAudioEntity can be instantiated server-side
 * and then be synced over the network to clients.
 *
 * If you only want to play audio and don't need to
 * position it in the simulation, an IgeAudioEntity is
 * overkill. You can use an IgeAudioControl instance instead.
 * The IgeAudioEntity uses an IgeAudioControl under the
 * hood anyway. This class is also designed for persistent
 * sound sources rather than incidental ones. If you are
 * looking to create incidental sound at a location you
 * can call the ige.audio.play() function instead.
 *
 * @see IgeAudioController.play()
 */
export class IgeAudioEntity extends IgeEntity {
	classId = "IgeAudioEntity";
	_audioControl?: IgeAudioControl;
	_playing: boolean = false;
	_loop: boolean = false;
	_gain: number = 1;
	_pannerSettings: PannerOptions = defaultPannerSettings;
	_relativeTo?: IgeEntity;
	_panner?: PannerNode;
	_audioSourceId?: string;

	constructor (props: IgeAudioEntityProps = {}) {
		super();

		const {
			audioId = "",
			playing = false,
			loop = false,
			gain = 1,
			pannerSettings = defaultPannerSettings,
			relativeTo = ""
		} = props;

		console.log("Creating IgeAudioEntity with args", props);

		if (audioId) {
			this._audioSourceId = audioId;
			this._audioControl = new IgeAudioControl(audioId);
		}

		if (gain !== undefined) {
			this._gain = gain;
		}

		if (pannerSettings !== undefined) {
			this._pannerSettings = pannerSettings;
		}

		if (loop !== undefined) {
			this.loop(loop);
		}

		if (relativeTo) {
			if (typeof relativeTo === "string") {
				this.relativeTo(ige.$(relativeTo));
			} else {
				this.relativeTo(relativeTo);
			}
		}

		if (playing) {
			// We take this out of process so that there is time
			// to handle other calls that may modify the audio
			// before playback starts
			setTimeout(() => {
				if (!this._audioControl) return;
				this._audioControl.play(this._loop);
			}, 1);
		}
	}

	/**
	 * Returns the data sent to each client when the entity
	 * is created via the network stream.
	 */
	streamCreateConstructorArgs (): [IgeAudioEntityProps] {
		return [{
			audioId: this._audioSourceId || "",
			playing: this._playing,
			loop: this._loop,
			gain: this._gain,
			pannerSettings: this._pannerSettings,
			relativeTo: this._relativeTo?.id() || ""
		}];
	}

	onStreamProperty (propName: string, propVal: any): this {
		super.onStreamProperty(propName, propVal);

		console.log("STREAM PROP", propName, propVal);

		switch (propName) {
			case "audioId":
				this.audioSourceId(propVal);
				break;

			case "playing":
				if (propVal === true) {
					this.play();
				} else {
					this.stop();
				}
				break;

			case "loop":
				this.loop(propVal);
				break;

			case "gain":
				this.gain(propVal);
				break;

			case "pannerSettings":
				this._pannerSettings = propVal;
				break;

			case "relativeTo":
				this.relativeTo(propVal);
				break;
		}

		return this;
	}

	relativeTo (val: IgeEntity): this;
	relativeTo (): IgeEntity | undefined;
	relativeTo (val?: IgeEntity) {
		if (val !== undefined) {
			const audioInterface = this.audioControl();
			if (!audioInterface) return;
			if (!ige.audio || !ige.audio._ctx) return;

			this._relativeTo = val;

			// Check if we have a panner node yet or not
			if (!audioInterface.panner()) {
				// Create a panner node for the audio output
				this._panner = new PannerNode(ige.audio._ctx, this._pannerSettings);

				this.audioControl()?.panner(this._panner);
			}

			return this;
		}

		return this._relativeTo;
	}

	/**
	 * Gets the playing boolean flag state.
	 * @returns {boolean} True if playing, false if not.
	 */
	playing (): boolean {
		return this._playing;
	}

	/**
	 * Gets / sets the id of the audio stream to use for
	 * playback.
	 * @param {string} [id] The audio id. Must match
	 * a previously registered audio stream that was
	 * registered via `ige.engine.audio.register()`.
	 * The audio component must be active in the engine to
	 * use this service via `ige.uses("audio");`.
	 * @returns {*}
	 */
	audioSourceId (): string | undefined;
	audioSourceId (id: string): this;
	audioSourceId (id?: string): string | this | undefined {
		if (id === undefined) {
			return this.audioControl()?.audioSourceId();
		}

		this._audioSourceId = id;
		this.audioControl()?.audioSourceId(id);
		return this;
	}

	gain (gain?: number) {
		if (gain === undefined) {
			return this._gain;
		}

		this._gain = gain;
		this.streamProperty("gain", gain);
		return this;
	}

	loop (loop?: boolean) {
		if (loop === undefined) {
			return this._loop;
		}

		this._loop = loop;
		this.audioControl()?.loop(loop);
		this.streamProperty("loop", loop);
		return this;
	}

	/**
	 * Starts playback of the audio.
	 * @param {boolean} loop If true, loops the audio until
	 * explicitly stopped by calling stop() or the entity
	 * being destroyed.
	 * @returns {IgeAudioEntity}
	 */
	play (loop: boolean = false) {
		this._playing = true;
		this.loop(loop);
		this.audioControl()?.play(loop);
		this.streamProperty("playing", true);
		this.streamProperty("loop", loop);
		return this;
	}

	/**
	 * Stops playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	stop () {
		this.audioControl()?.stop();
		this.streamProperty("playing", false);
		return this;
	}

	/**
	 * Gets / sets the IgeAudioControl instance used to control
	 * playback of the audio stream.
	 * @param {IgeAudioControl=} [audio]
	 * @returns {*}
	 */
	audioControl (): IgeAudioControl | undefined;
	audioControl (audio: IgeAudioControl): this;
	audioControl (audio?: IgeAudioControl) {
		if (audio !== undefined) {
			this._audioControl = audio;
			return this;
		}

		return this._audioControl;
	}

	update (tickDelta: number) {
		if (!this._relativeTo || !this._panner) {
			return super.update(tickDelta);
		}

		const audioWorldPos = this.worldPosition();
		const relativeToWorldPos = this._relativeTo.worldPosition();

		// Update the audio origin position
		if (this._panner) {
			this._panner.positionX.value = audioWorldPos.x - relativeToWorldPos.x;
			this._panner.positionY.value = -audioWorldPos.y - -relativeToWorldPos.y;
			this._panner.positionZ.value = audioWorldPos.z - relativeToWorldPos.z;
		}

		return super.update(tickDelta);
	}

	/**
	 * Called when the entity is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		if (isClient) {
			this.audioControl()?.stop();
		}

		super.destroy();
		return this;
	}
}

registerClass(IgeAudioEntity);