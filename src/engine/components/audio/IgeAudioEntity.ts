import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { isServer } from "@/engine/utils/clientServer";
import { registerClass } from "@/engine/utils/igeClassStore";
import type { IgeAudioPlaybackOptions } from "@/types/IgeAudioPlaybackOptions";

// Set default data for any audio panner node
export const defaultPannerSettings: PannerOptions = {
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
	playOnMount?: boolean;
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
	_isPlaying: boolean = false;
	_playOnMount: boolean = false;
	_loop: boolean = false;
	_volume: number = 1;
	_pannerSettings: PannerOptions = defaultPannerSettings;
	_relativeTo?: IgeEntity | string;
	_panner?: PannerNode;
	_audioSourceId?: string;
	_playbackControlId?: string;

	constructor (props: IgeAudioEntityProps = {}) {
		super();

		const {
			audioId = "",
			playOnMount = false,
			loop = false,
			volume = 1,
			pannerSettings = defaultPannerSettings,
			relativeTo = ""
		} = props;

		console.log("Creating IgeAudioEntity with args", props);

		this.audioSourceId(audioId);
		this.pannerSettings(pannerSettings);
		this.playOnMount(playOnMount);
		this.relativeTo(relativeTo);
		this.volume(volume);
		this.loop(loop);
	}

	/**
	 * Returns the data sent to each client when the entity
	 * is created via the network stream.
	 */
	streamCreateConstructorArgs (): [IgeAudioEntityProps] {
		return [{
			audioId: this._audioSourceId || "",
			relativeTo: this._relativeTo || "",
			pannerSettings: this._pannerSettings,
			playOnMount: this._playOnMount,
			loop: this._loop,
			volume: this._volume
		}];
	}

	onStreamProperty (propName: string, propVal: any): this {
		super.onStreamProperty(propName, propVal);

		switch (propName) {
			case "audioId":
				this.audioSourceId(propVal);
				break;

			case "relativeTo":
				this.relativeTo(propVal);
				break;

			case "pannerSettings":
				this.pannerSettings(propVal);
				break;

			case "playOnMount":
				this.playOnMount(propVal);
				break;

			case "loop":
				this.loop(propVal);
				break;

			case "volume":
				this.volume(propVal);
				break;

			case "isPlaying":
				if (propVal === true) {
					void this.play();
				} else {
					this.stop();
				}
				break;
		}

		return this;
	}

	playOnMount (): boolean;
	playOnMount (val: boolean): this;
	playOnMount (val?: boolean): boolean | this {
		if (val === undefined) {
			return this._playOnMount;
		}

		this._playOnMount = val;
		this.streamProperty("playOnMount", val);
		return this;
	}

	pannerSettings (): PannerOptions;
	pannerSettings (val: PannerOptions): this;
	pannerSettings (val?: PannerOptions): PannerOptions | this {
		if (val === undefined) {
			return this._pannerSettings;
		}

		this._pannerSettings = val;
		this.streamProperty("pannerSettings", val);
		return this;
	}

	relativeTo (): IgeEntity | string | undefined;
	relativeTo (val: IgeEntity | string): this;
	relativeTo (val?: IgeEntity | string): IgeEntity | string | this | undefined {
		if (val === undefined) {
			return this._relativeTo;
		}

		this._relativeTo = val;
		this.streamProperty("relativeTo", val);
		return this;
	}

	/**
	 * Gets the playing state.
	 * @returns {boolean} True if playing, false if not.
	 */
	isPlaying (): boolean {
		return this._isPlaying;
	}

	/**
	 * Gets / sets the id of the audio stream to use for playback.
	 * @param {string} [id] The audio id. Must match
	 * a previously registered audio stream that was
	 * registered via `ige.engine.audio.register()`.
	 * The audio component must be active in the engine to
	 * use this service via `ige.uses("audio");`.
	 * @returns {*}
	 */
	audioSourceId (): string | undefined;
	audioSourceId (val: string): this;
	audioSourceId (val?: string): string | this | undefined {
		if (val === undefined) {
			return this._audioSourceId;
		}

		this._audioSourceId = val;
		this.streamProperty("audioSourceId", val);
		return this;
	}

	volume (val?: number) {
		if (val === undefined) {
			return this._volume;
		}

		this._volume = val;
		this.streamProperty("volume", val);
		return this;
	}

	loop (val?: boolean) {
		if (val === undefined) {
			return this._loop;
		}

		this._loop = val;
		this.streamProperty("loop", val);
		return this;
	}

	/**
	 * Starts playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	play (): this | null {
		// If we're not yet mounted, set the playOnMount flag instead
		// so that when we get mounted, playback will start automatically
		if (!this.isMounted()) {
			this.playOnMount(true);
			return null;
		}

		this.streamProperty("isPlaying", true);

		// Start playback using the audio controller component
		const playbackItem = ige.audio.createPlaybackControl(this._audioSourceId, {
			loop: this._loop,
			volume: this._volume,
			pannerSettings: this._pannerSettings,
			relativeTo: this._relativeTo,
			isPersistent: true
		});

		if (playbackItem === null) return null;

		this._playbackControlId = playbackItem._id;
		ige.audio.startPlaybackItem(this._playbackControlId);
		return this;
	}

	/**
	 * Stops playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	stop (): this {
		this._isPlaying = false;
		this.streamProperty("isPlaying", false);
		return this;
	}

	update (tickDelta: number) {
		if (isServer || !this._relativeTo || !this._panner || !this._audioSourceId) {
			return super.update(tickDelta);
		}

		ige.audio.setPosition(this._audioSourceId, this.worldPosition());
		return super.update(tickDelta);
	}

	/**
	 * Called when the entity is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		this.stop();
		super.destroy();
		return this;
	}

	_mounted (obj: IgeEntity) {
		super._mounted(obj);

		// If the playOnMount flag is true, start playback
		if (this._playOnMount) {
			void this.play();
		}
	}

	_unMounted (obj: IgeEntity) {
		void this.stop();
		super._unMounted(obj);
	}
}

registerClass(IgeAudioEntity);
