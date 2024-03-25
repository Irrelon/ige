import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { ige } from "@/engine/instance";
import { isServer } from "@/engine/utils/clientServer";

/**
 * Handles controlling an audio source.
 * You can use an instance of IgeAudioControl to
 * start or stop playback of audio.
 */
export class IgeAudioControl extends IgeEventingClass {
	classId = "IgeAudioControl";
	_buffer?: AudioBuffer;
	_bufferSource?: AudioBufferSourceNode;
	_playWhenReady: boolean = false;
	_loop: boolean = false;
	_playing: boolean = false;
	_panner?: PannerNode;
	_audioSourceId?: string;

	constructor (audioSourceId?: string) {
		super();

		if (audioSourceId) {
			this.audioSourceId(audioSourceId);
		}
	}

	playing (val?: boolean) {
		if (val !== undefined) {
			this._playing = val;
			return this;
		}

		return this._playing;
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

		this.buffer(audioItem.buffer);
		return this;
	}

	/**
	 * Gets / sets the current audio buffer.
	 * @param {AudioBuffer} [buffer]
	 * @returns {*}
	 */
	buffer (): AudioBuffer;
	buffer (buffer: AudioBuffer): this;
	buffer (buffer?: AudioBuffer): AudioBuffer | this | undefined {
		if (buffer === undefined) {
			return this._buffer;
		}

		this._buffer = buffer;

		if (this._playWhenReady) {
			this.play(this._loop);
		}

		return this;
	}

	panner (val: PannerNode): this;
	panner (): PannerNode;
	panner (val?: PannerNode) {
		if (val === undefined) {
			return this._panner;
		}

		this._panner = val;

		if (this._bufferSource && ige.audio) {
			// Make sure we include the panner in the connections
			this._bufferSource.connect(this._panner);
			this._panner.connect(ige.audio._masterVolumeNode);
		}

		return this;
	}

	/**
	 * Plays the audio.
	 */
	play (loop?: boolean) {
		if (!ige.audio) return;
		if (!this._buffer || !ige.audio._ctx) {
			this._playWhenReady = true;
			if (loop !== undefined) {
				this.loop(loop);
			}
			this._playing = true;
			return;
		}

		this._bufferSource = ige.audio._ctx.createBufferSource();
		if (!this._bufferSource) return;
		this._bufferSource.buffer = this._buffer;

		if (this._panner) {
			// Connect through the panner
			this._bufferSource.connect(this._panner);
			this._panner.connect(ige.audio._masterVolumeNode);
		} else {
			// Connect directly to the destination
			this._bufferSource.connect(ige.audio._masterVolumeNode);
		}

		this._bufferSource.loop = this.loop();
		this._bufferSource.start(0);

		this._playing = true;
		this.log(`Audio file (${this._audioSourceId}) playing...`);
	}

	loop (): boolean;
	loop (loop: boolean): this;
	loop (loop?: boolean): boolean | this {
		if (loop === undefined) {
			return this._loop;
		}

		this._loop = loop;
		if (!this._bufferSource) return this;
		this._bufferSource.loop = loop;
		return this;
	}

	/**
	 * Stops the currently playing audio.
	 */
	stop () {
		if (this._bufferSource) {
			this.log(`Audio file (${this._audioSourceId}) stopping...`);
			this._bufferSource.stop();
		} else {
			this._playWhenReady = false;
		}

		this._playing = false;
	}
}
