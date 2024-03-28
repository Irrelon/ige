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
	_audioSourceBuffer?: AudioBuffer;
	_bufferNode: AudioBufferSourceNode | null = null;
	_shouldPlayWhenReady: boolean = false;
	_isPersistent: boolean = false;
	_loop: boolean = false;
	_isPlaying: boolean = false;
	_pannerNode?: PannerNode;
	_pannerSettings?: PannerOptions;
	_position?: IgePoint3d;
	_relativeTo?: string | IgeEntity;
	_audioSourceId?: string;
	_onEnded?: () => void;
	_resumePlaybackOffset: number = 0;
	_startTime: number = 0;

	constructor () {
		super();

		this._id = newIdHex();
		console.log("IgeAudioControl create", this._id);

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

		this._audioSourceBuffer = audioItem.buffer;

		if (this.shouldPlayWhenReady()) {
			this.play();
		}

		return this;
	}

	/**
	 * Plays the audio.
	 */
	play (playbackFromOffset?: number) {
		if (!ige.audio) return;
		if (!this._audioSourceBuffer || !ige.audio._ctx) {
			this.shouldPlayWhenReady(true);
			return;
		}
		if (this.isPlaying()) return;

		// Create our buffer source node
		this._bufferNode = new AudioBufferSourceNode(ige.audio._ctx);
		this._bufferNode.connect(this._gainNode);
		this._bufferNode.buffer = this._audioSourceBuffer;
		this._bufferNode.loop = this._loop;

		if (playbackFromOffset) {
			// Start playback from the designated location
			this._bufferNode.start(0, playbackFromOffset);
			this._resumePlaybackOffset = ige.audio._ctx.currentTime - playbackFromOffset;
		} else {
			// Start playback from our resume location
			this._bufferNode.start(0, this._resumePlaybackOffset);
			this._resumePlaybackOffset = ige.audio._ctx.currentTime - this._resumePlaybackOffset;
			if (this._startTime) {
				this._startTime = this._startTime + (ige.audio._ctx.currentTime - this._startTime);
			} else {
				this._startTime = ige.audio._ctx.currentTime;
			}
		}

		// Set internal playing flag
		this.isPlaying(true);

		// Check if we need to do anything when playback ends
		if (this._onEnded) {
			this._bufferNode.onended = this._onEnded;
		}

		this.log(`Audio file (${this._audioSourceId}) playing...`);
	}

	loop (): boolean;
	loop (loop: boolean): this;
	loop (loop?: boolean): boolean | this {
		if (loop === undefined) {
			return this._loop;
		}

		this._loop = loop;
		if (this._bufferNode) {
			this._bufferNode.loop = loop;
		}
		return this;
	}

	/**
	 * Similar to stop but will keep the current payback progress / location
	 * and when play() is called, playback will resume from the current
	 * location. If you pause() then stop() then play(), playback will start
	 * from the beginning again. Calling stop() will reset the playback
	 * location to the start of the audio track.
	 */
	pause () {
		if (this._bufferNode) {
			this.log(`Audio file (${this._audioSourceId}) stopping...`);
			this._bufferNode.stop(0);
			this._bufferNode.disconnect();
			if (ige.audio._ctx) {
				this._resumePlaybackOffset = ige.audio._ctx.currentTime - this._resumePlaybackOffset;
			}
			this._bufferNode = null;
		}

		this.shouldPlayWhenReady(false);
		this.isPlaying(false);
	}


	/**
	 * Stops the currently playing audio.
	 */
	stop () {
		this.log(`Audio file (${this._audioSourceId}) stopping...`);
		if (this._bufferNode) {
			this._bufferNode.stop(0);
			this._bufferNode.disconnect();
			this._bufferNode = null;
		}
		this._resumePlaybackOffset = 0;
		this._startTime = 0;

		this.shouldPlayWhenReady(false);
		this.isPlaying(false);
	}

	/**
	 * Called when the audio control is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		console.log("IgeAudioControl destroy", this._id);
		this.stop();
		this._pannerNode?.disconnect();
		this._gainNode?.disconnect();
		this._bufferNode?.disconnect();

		ige.audio.removeAudioControl(this._id);
		return this;
	}
}

export interface IgeAudioControl {
	isPersistent (val?: boolean): boolean | this;

	isPlaying (val?: boolean): boolean | this;

	shouldPlayWhenReady (val?: boolean): boolean | this;

	relativeTo (val?: IgeEntity | string): IgeEntity | string | this | undefined;

	onEnded (val?: () => void): () => void | this | undefined;

	pannerSettings (val?: PannerOptions): PannerOptions | this | undefined;

	position (val?: IgePoint3d): IgePoint3d | this | undefined;
}

synthesize(IgeAudioControl, "isPersistent");
synthesize(IgeAudioControl, "isPlaying");
synthesize(IgeAudioControl, "shouldPlayWhenReady");
synthesize(IgeAudioControl, "relativeTo");
synthesize(IgeAudioControl, "onEnded");
synthesize(IgeAudioControl, "pannerSettings");
synthesize(IgeAudioControl, "position");
