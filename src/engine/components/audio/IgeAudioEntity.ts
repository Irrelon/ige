import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { isServer } from "@/engine/utils/clientServer";
import { registerClass } from "@/engine/utils/igeClassStore";
import { synthesize } from "@/engine/utils/synthesize";
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

export interface IgeAudioEntityProps extends Omit<IgeAudioPlaybackOptions, "relativeTo"> {
	audioId?: string;
	playOnMount?: boolean;
}

/**
 * Creates an audio entity that automatically handles
 * controlling panning / positioning of sound based on
 * where it is located on the screen in relation to
 * the listener / player.
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
	_audioSourceId?: string;
	_playbackControlId?: string;

	constructor (props: IgeAudioEntityProps = {}) {
		super();

		const {
			audioId = "",
			playOnMount = false,
			loop = false,
			volume = 1,
			pannerSettings = defaultPannerSettings
		} = props;

		console.log("Creating IgeAudioEntity with args", props);

		this.audioSourceId(audioId);
		this.pannerSettings(pannerSettings);
		this.playOnMount(playOnMount);
		this.volume(volume);
		this.loop(loop);
	}

	/**
	 * Starts playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	play (): this {
		// If we're not yet mounted, set the playOnMount flag instead
		// so that when we get mounted, playback will start automatically
		this.playOnMount(true);

		if (!this.isMounted()) {
			return this;
		}

		this.isPlaying(true);

		if (isServer) {
			return this;
		}
		
		// Start playback using the audio controller component
		const playbackItem = ige.audio.createAudioControl(this._audioSourceId, {
			loop: this._loop,
			volume: this._volume,
			pannerSettings: this._pannerSettings,
			relativeTo: this,
			isPersistent: true
		});

		if (playbackItem === null) return this;

		this._playbackControlId = playbackItem._id;
		playbackItem.play();
		return this;
	}

	/**
	 * Stops playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	stop (): this {
		this.isPlaying(false);
		this.playOnMount(false);
		ige.audio.stopPlaybackItem(this._playbackControlId);
		return this;
	}

	update (tickDelta: number) {
		if (isServer || !this._audioSourceId) {
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

export interface IgeAudioEntity {
	/**
	 * Gets the playing state.
	 * @returns {boolean} True if playing, false if not.
	 */
	isPlaying (): boolean;

	isPlaying (val: boolean): this;

	isPlaying (val?: boolean): this | boolean;

	playOnMount (): boolean;

	playOnMount (val: boolean): this;

	playOnMount (val?: boolean): boolean | this;

	pannerSettings (): PannerOptions;

	pannerSettings (val: PannerOptions): this;

	pannerSettings (val?: PannerOptions): PannerOptions | this;

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

	audioSourceId (val?: string): string | this | undefined;

	volume (): number;

	volume (val: number): this;

	volume (val?: number): this | number;

	loop (): boolean;

	loop (val: boolean): this;

	loop (val?: boolean): this | boolean;
}

synthesize(IgeAudioEntity, "playOnMount");
synthesize(IgeAudioEntity, "pannerSettings");
synthesize(IgeAudioEntity, "audioSourceId");
synthesize(IgeAudioEntity, "volume");
synthesize(IgeAudioEntity, "loop");
synthesize(IgeAudioEntity, "isPlaying");

registerClass(IgeAudioEntity);
