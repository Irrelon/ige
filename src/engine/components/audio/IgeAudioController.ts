import { defaultPannerSettings } from "@/engine/components/audio/IgeAudioEntity";
import type { IgeAudioSource } from "@/engine/components/audio/IgeAudioSource";
import { IgeAssetRegister } from "@/engine/core/IgeAssetRegister";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import { ige } from "@/engine/instance";
import { arrPullConditional } from "@/engine/utils/arrays";
import { isClient } from "@/engine/utils/clientServer";
import { IgeBehaviourType } from "@/enums";
import type { IgeAudioPlaybackData } from "@/types/IgeAudioPlaybackData";
import type { IgeAudioPlaybackOptions } from "@/types/IgeAudioPlaybackOptions";

export class IgeAudioController extends IgeAssetRegister<IgeAudioSource> {
	classId = "IgeAudioController";
	_active: boolean = false;
	_disabled: boolean = false;
	_ctx?: AudioContext;
	_masterVolumeNode: GainNode;
	_audioBufferStore: Record<string, AudioBuffer> = {};
	_playbackArr: IgeAudioPlaybackData[] = [];

	constructor () {
		super();
		this._active = false;
		this._disabled = false;

		this._ctx = this.getContext();

		if (!this._ctx) {
			this.log("No web audio API support, audio is disabled!");
			this._disabled = true;
		}

		if (this._ctx.state === "suspended") {
			this.log("Audio support is available, waiting for user interaction to be allowed to play audio");
		}

		this._masterVolumeNode = this._ctx.createGain();
		this._masterVolumeNode.connect(this._ctx.destination);

		// Set listener orientation to match our 2d plane
		// The setOrientation() method is deprecated but still supported.
		// FireFox has (of writing) currently not provided any other way to set orientation,
		// so we must continue to use this method until that changes
		// TODO: Wait for Firefox to support accessor properties and then update this
		this.setListenerOrientation(Math.cos(0.1), 0, Math.sin(0.1), 0, 1, 0);

		// Register the engine behaviour that will get called at the end of any updates
		// so we can check for entities we need to track and alter the panning of any
		// active audio to pan relative to the entity in question
		ige.engine.addBehaviour<IgeEngine>(IgeBehaviourType.postUpdate, "audioPanning", this._onPostUpdate);

		this.log("Web audio API connected successfully");
	}

	setListenerOrientation (x, y, z, xUp, yUp, zUp) {
		if (!this._ctx) {
			this.log("Cannot set listener orientation, the audio context is not initialised", "warning");
			return;
		}

		this._ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
	}

	/**
	 * When first instantiated the audio context might
	 * be in a suspended state because the browser doesn't
	 * let us play audio until the user interacts with the
	 * elements on the page. This function should be called
	 * in an event listener triggered by a user interaction
	 * such as a click handler etc.
	 */
	interact () {
		if (!this._ctx) return false;
		if (this._ctx.state !== "suspended") return true;

		void this._ctx.resume().then((...args: any[]) => {
			console.log("Audio resume", args);
		});

		return true;
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
	getContext (): AudioContext {
		return new window.AudioContext();
	}

	/**
	 * Plays audio by its assigned id and returns a promise.
	 * If the audio context is unavailable, or we are on the server,
	 * the promise resolves immediately with a `false` value.
	 *
	 * Once playback has ended the promise will resolve with `true`.
	 * @param {string} id The id of the audio file to play.
	 * @param {IgeAudioPlaybackOptions} [options={}]
	 */
	play (id: string, options: IgeAudioPlaybackOptions = {}): Promise<boolean> {
		return new Promise((resolve) => {
			if (!isClient || !this._ctx) {
				resolve(false);
				return;
			}

			const relativeTo = options.relativeTo;
			const gain: number = typeof options.gain !== "undefined" ? options.gain : 1;
			const loop: boolean = typeof options.loop !== "undefined" ? options.loop : false;
			const pannerSettings = typeof options.pannerSettings !== "undefined" ? options.pannerSettings : defaultPannerSettings;

			const audioSource = this.get(id);

			if (!audioSource || !audioSource.buffer) {
				this.log(`Audio file (${id}) could not play, no buffer exists in register for: ${id}`, "warning");
				return;
			}

			if (!this._masterVolumeNode) return;

			let pannerNode: PannerNode | undefined;
			const bufferNode = this._ctx.createBufferSource();

			if (relativeTo) {
				// Create a panner node for the audio output
				pannerNode = new PannerNode(this._ctx, pannerSettings);
				bufferNode.connect(pannerNode);
				pannerNode.connect(ige.audio._masterVolumeNode);
			} else {
				bufferNode.connect(this._masterVolumeNode);
			}

			bufferNode.buffer = audioSource.buffer;
			bufferNode.loop = options.loop as boolean;
			bufferNode.start(0);

			bufferNode.onended = () => {
				resolve(true);
				arrPullConditional(this._playbackArr, (item) => item.bufferNode === bufferNode);
			};

			this._playbackArr.push({
				audioId: id,
				bufferNode,
				pannerNode,
				loop
			});

			this.log(`Audio file (${id}) playing...`);
		});
	}

	/**
	 * Gets / sets the active flag to enable or disable audio support.
	 * @param {boolean=} val True to enable audio support.
	 * @returns {*}
	 */
	active (val?: boolean): boolean | this {
		if (val !== undefined && !this._disabled) {
			this._active = val;
			return this;
		}

		return this._active;
	}

	/**
	 * Loads an audio file from the given url.
	 * @param {string} url The url to load the audio file from.
	 * file has loaded or on error.
	 */
	async _load (url: string) {
		this.log(`Request to load audio file (${url})...`);
		return new Promise<AudioBuffer>((resolve, reject) => {
			const request = new XMLHttpRequest();

			request.open("GET", url, true);
			request.responseType = "arraybuffer";

			// Decode asynchronously
			request.onload = () => {
				this._loaded(url, request.response as ArrayBuffer)
					.then((buffer) => {
						if (!buffer) {
							return reject(new Error("Could not create audio buffer"));
						}

						resolve(buffer);
					})
					.catch((err) => {
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
				return buffer;
			})
			.catch((err: any) => {
				throw new Error(`Failed to decode audio "${url}": ${err}`);
			});
	}

	/**
	 * Decodes audio data and calls back with an audio buffer.
	 * @param {ArrayBuffer} data The audio data to decode.
	 * @private
	 */
	_decode = async (data: ArrayBuffer): Promise<AudioBuffer | undefined> => {
		if (!this._ctx) return;
		return this._ctx.decodeAudioData(data);
	};

	/**
	 * Called after all engine update() scenegraph calls and loops the currently
	 * playing audio to ensure that the panning of that audio matches the position
	 * of the entity it should emit audio relative to.
	 */
	_onPostUpdate () {
		this._playbackArr.forEach((audioPlayback) => {
			if (!audioPlayback.relativeTo || !audioPlayback.position || !audioPlayback.pannerNode) return;

			const audioWorldPos = audioPlayback.position;
			const relativeToWorldPos = audioPlayback.relativeTo.worldPosition();
			const pannerNode = audioPlayback.pannerNode;

			// Update the audio origin position
			pannerNode.positionX.value = audioWorldPos.x - relativeToWorldPos.x;
			pannerNode.positionY.value = -audioWorldPos.y - -relativeToWorldPos.y;
			pannerNode.positionZ.value = audioWorldPos.z - relativeToWorldPos.z;
		});
	}
}
