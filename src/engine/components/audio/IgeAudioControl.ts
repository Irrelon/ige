import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";
import { isServer } from "@/engine/utils/clientServer";
import { newIdHex } from "@/engine/utils/ids";
import { synthesize } from "@/engine/utils/synthesize";
import type { IgeCanId } from "@/types/IgeCanId";

/**
 * Handles controlling an audio source. You can use an instance of
 * IgeAudioControl to start or stop playback of audio, but usually
 * you would do this directly via `ige.audio.play()` or by using
 * an `IgeAudioEntity` to allow streaming and further manipulation.
 */
export class IgeAudioControl extends IgeEventingClass implements IgeCanId {
	classId = "IgeAudioControl";
	_id: string;
	_gainNode: GainNode;
	_bufferNode: AudioBufferSourceNode;
	_playWhenReady: boolean = false;
	_isPersistent: boolean = false;
	_loop: boolean = false;
	_isPlaying: boolean = false;
	_pannerNode?: PannerNode;
	_pannerSettings?: PannerOptions;
	_position?: IgePoint3d;
	_relativeTo?: string | IgeEntity;
	_audioSourceId?: string;
	_onEnded?: () => void;

	constructor () {
		super();

		this._id = newIdHex();

		if (!ige.audio) {
			if (isServer) {
				throw new Error("Cannot instantiate an IgeAudioControl on the server!");
			}

			throw new Error(`The audio subsystem is not present, did you add the audio controller via ige.uses("audio")?`);
		}

		if (!ige.audio._ctx) {
			throw new Error("Cannot instantiate an IgeAudioControl without an audio context!");
		}

		// We are going to create a node graph like this:
		// buffer -> this volume (gain) -> panner -> master volume (gain) -> speaker output
		this._pannerNode = new PannerNode(ige.audio._ctx, this._pannerSettings);
		this._pannerNode.connect(ige.audio.masterVolumeNode);
		this._gainNode = new GainNode(ige.audio._ctx);
		this._gainNode.connect(this._pannerNode);
		this._bufferNode = new AudioBufferSourceNode(ige.audio._ctx);
		this._bufferNode.connect(this._gainNode);
	}

	// @ts-ignore
	abstract isPersistent (val?: boolean): boolean | this;

	// @ts-ignore
	abstract isPlaying (val?: boolean): boolean | this;

	// @ts-ignore
	abstract playWhenReady (val?: boolean): boolean | this;

	// @ts-ignore
	abstract relativeTo (val?: IgeEntity | string): IgeEntity | string | this | undefined;

	// @ts-ignore
	abstract onEnded (val?: () => void): () => void | this | undefined;

	// @ts-ignore
	abstract pannerSettings (val?: PannerOptions): PannerOptions | this | undefined;

	// @ts-ignore
	abstract position (val?: IgePoint3d): IgePoint3d | this | undefined;

	volume (val?: number): number | this {
		if (val === undefined) {
			return this._gainNode.gain.value;
		}

		this._gainNode.gain.value = val;
		return this;
	}

	/**
	 * Gets or sets the audioSourceId for this item. If setting an audioSourceId,
	 * you must first have created the audio source with the global audio
	 * controller via `new IgeAudioSource(audioSourceId, url);`.
	 * @param {string} [audioSourceId]
	 */
	audioSourceId (): string;
	audioSourceId (audioSourceId: string): this;
	audioSourceId (audioSourceId?: string) {
		if (audioSourceId === undefined) {
			return this._audioSourceId;
		}

		this._audioSourceId = audioSourceId;

		if (!ige.audio || isServer) return this;

		const audioItem = ige.audio.get(audioSourceId);
		if (!audioItem || !audioItem.buffer) {
			throw new Error(`The audio asset with id ${audioSourceId} does not exist. Add it with \`new IgeAudioSource(audioSourceId, url);\` first!`);
		}

		this._bufferNode.buffer = audioItem.buffer;

		if (this._playWhenReady) {
			this.play();
		}

		return this;
	}

	/**
	 * Plays the audio.
	 */
	play () {
		if (!ige.audio) return;
		if (!this._bufferNode.buffer || !ige.audio._ctx) {
			this._playWhenReady = true;
			return;
		}

		if (this._pannerNode) {
			// Connect through the panner
			this._bufferNode.connect(this._pannerNode);
			this._pannerNode.connect(ige.audio.masterVolumeNode);
		} else {
			// Connect directly to the destination
			this._bufferNode.connect(ige.audio.masterVolumeNode);
		}

		this._bufferNode.loop = this.loop();
		this._bufferNode.start(0);

		this._isPlaying = true;
		this.log(`Audio file (${this._audioSourceId}) playing...`);
	}

	loop (): boolean;
	loop (loop: boolean): this;
	loop (loop?: boolean): boolean | this {
		if (loop === undefined) {
			return this._loop;
		}

		this._loop = loop;
		this._bufferNode.loop = loop;
		return this;
	}

	/**
	 * Stops the currently playing audio.
	 */
	stop () {
		if (this._bufferNode) {
			this.log(`Audio file (${this._audioSourceId}) stopping...`);
			this._bufferNode.stop(0);
		}

		this._playWhenReady = false;
		this._isPlaying = false;
	}

	/**
	 * Called when the audio control is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		this.stop();
		ige.audio.removePlaybackControl(this._id);
		return this;
	}
}

synthesize(IgeAudioControl, "isPersistent");
synthesize(IgeAudioControl, "isPlaying");
synthesize(IgeAudioControl, "playWhenReady");
synthesize(IgeAudioControl, "relativeTo");
synthesize(IgeAudioControl, "onEnded");
synthesize(IgeAudioControl, "pannerSettings");
synthesize(IgeAudioControl, "position");
