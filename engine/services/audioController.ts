import { ige } from "../instance";
import IgeEventingClass from "../core/IgeEventingClass";

export class IgeAudioController extends IgeEventingClass {
	classId = "IgeAudioController";
	_active: boolean;
	_disabled: boolean;
	_ctx: AudioContext;
	_masterVolumeNode?: GainNode;
	_register: Record<string, AudioBuffer>;

	constructor () {
		super();
		this._active = false;
		this._disabled = false;
		this._ctx = this.getContext();
		this._register = {};

		if (!this._ctx) {
			this.log("No web audio API support, cannot play sounds!", "warning");
			this._disabled = true;
			return;
		}

		this._masterVolumeNode = this._ctx.createGain();
		this._masterVolumeNode.connect(this._ctx.destination);

		// Set listener orientation to match our 2d plane
		this._ctx.listener.setOrientation(Math.cos(0.10), 0, Math.sin(0.10), 0, 1, 0);

		this.log("Web audio API connected successfully");
	}

	/**
	 * Gets / sets the master volume for sound output.
	 * @param val
	 * @returns {*}
	 */
	masterVolume (val?: number) {
		if (!this._masterVolumeNode) return;

		if (val !== undefined) {
			this._masterVolumeNode.gain.value = val;
			return this;
		}

		return this._masterVolumeNode.gain.value;
	}

	/**
	 * Returns an audio context.
	 * @returns {*}
	 */
	getContext () {
		return new window.AudioContext();
	}

	/**
	 * Gets / loads an audio file from the given url and assigns it the id specified
	 * in the global audio register.
	 * @param {String} id The id to assign the audio in the register.
	 * @param {String=} url The url to load the audio from.
	 */
	register (id: string): AudioBuffer;
	register (id: string, url?: string) {
		if (!id) {
			return this._register;
		}

		if (!url) {
			return this._register[id];
		}

		// Assign new audio to register
		this._load(url).then((buffer) => {
			this._register[id] = buffer;
		});

		return this;
	}

	/**
	 * Plays audio by its assigned id.
	 * @param {String} id The id of the audio file to play.
	 * @param {Boolean} loop If true, will loop the audio until
	 * it is explicitly stopped.
	 */
	play (id: string, loop: boolean = false) {
		if (!ige.isClient) {
			return;
		}

		const buffer = this.register(id);

		if (!buffer) {
			this.log(`Audio file (${id}) could not play, no buffer exists in register for: ${id}`, "warning");
			return;
		}

		if (!this._masterVolumeNode) return;

		const bufferSource = this._ctx.createBufferSource();
		bufferSource.buffer = this.register(id);
		bufferSource.connect(this._masterVolumeNode);
		bufferSource.loop = loop;
		bufferSource.start(0);

		this.log(`Audio file (${id}) playing...`);
	}

	/**
	 * Gets / sets the active flag to enable or disable audio support.
	 * @param {Boolean=} val True to enable audio support.
	 * @returns {*}
	 */
	active (val?: boolean) {
		if (val !== undefined && !this._disabled) {
			this._active = val;
			return this;
		}

		return this._active;
	}

	/**
	 * Loads an audio file from the given url.
	 * @param {String} url The url to load the audio file from.
	 * @param {Function=} callback Optional callback method to call when the audio
	 * file has loaded or on error.
	 */
	async _load (url: string) {
		return new Promise<AudioBuffer>((resolve, reject) => {
			const request = new XMLHttpRequest();

			request.open("GET", url, true);
			request.responseType = "arraybuffer";

			// Decode asynchronously
			request.onload = () => {
				this._loaded(url, request.response as ArrayBuffer).then((buffer) => {
					resolve(buffer);
				}).catch((err) => {
					reject(err);
				});
			};

			request.onerror = (err) => {
				reject(err);
			};

			request.send();
		});
	}

	async _loaded (url: string, data: ArrayBuffer) {
		return this._decode(data)
			.then((buffer) => {
				this.log(`Audio file (${url}) loaded successfully`);
				return buffer;
			}).catch((err: any) => {
				throw new Error(`Failed to decode audio "${url}": ${err}`);
			});
	}

	/**
	 * Decodes audio data and calls back with an audio buffer.
	 * @param {ArrayBuffer} data The audio data to decode.
	 * @param {Function} callback The callback to pass the buffer to.
	 * @private
	 */
	_decode = async (data: ArrayBuffer): Promise<AudioBuffer> => {
		return this._ctx.decodeAudioData(data);
	}
}

export const audioController = new IgeAudioController();
