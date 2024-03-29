import { IgeAudioControl } from "@/engine/components/audio/IgeAudioControl";
import { defaultPannerSettings } from "@/engine/components/audio/IgeAudioEntity";
import type { IgeAudioSource } from "@/engine/components/audio/IgeAudioSource";
import { IgeAssetRegister } from "@/engine/core/IgeAssetRegister";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";
import { arrPullConditional } from "@/engine/utils/arrays";
import { isClient } from "@/engine/utils/clientServer";
import { IgeBehaviourType } from "@/enums";
import type { IgeAudioPlaybackOptions } from "@/types/IgeAudioPlaybackOptions";
import type { IgeIsReadyPromise } from "@/types/IgeIsReadyPromise";

/**
 * This class is a component that you use by telling the engine it's a
 * dependency by calling `ige.uses("audio");`. After that, you can directly
 * play back audio by first creating an audio source and then calling play()
 * with the source id.
 *
 * @example Load an audio source from an .mp3 file and play it
 *      // Load a .mp3 file as an audio source
 *      new IgeAudioSource("mySound1", "./assets/audio/someAudioFile.mp3");
 *
 *      // Now playback the audio
 *      ige.audio.play("mySound1");
 *
 * @example Play a sound at a specific position on the sound stage
 *      ige.audio.play("mySound1", {position: {x: 10, y: 5: z: 0}});
 *
 * @example Make the sound play relative to a player entity
 *      // If we have a player entity with the id "player", tell the sound
 *      // to play at a position and set the player entity as the point that
 *      // the audio should pan relative to. The audio will pan automatically
 *      // as the player's entity location changes.
 *      const player = ige.$("player");
 *      ige.audio.play("mySound1", {
 *          position: {x: 10, y: 5: z: 0},
 *          relativeTo: player // <- Notice we make the sound relative to the player
 *      });
 *
 *      // Now, if you move the player entity to the left of the sound
 *      // the audio will "pan" to the right of the player e.g.
 *      player.translateTo(0, 5, 0);
 *
 *      // The player is now at x:0 and the sound is at x:10. Because of
 *      // this, the sound should be coming from the right of the player.
 *      // To hear the sound from the left of the player, we can move it
 *      // again so the player is to the right of the sound (x > 10):
 *      player.translateTo(20, 5, 0);
 *
 * @example Persistent sounds at a location
 *      // Often is it useful to place a sound emitter at a static location
 *      // in a scene and as the player gets closer to the sound, the sound
 *      // becomes more audible as it's volume increases with reduced distance
 *      // to the sound source. In this case, you can either use the same
 *      // concept as the above examples but set the `loop` option to true,
 *      // or you can create an audio entity that gets mounted to the scene
 *      // like any other entity and has all the same properties as a normal
 *      // entity does. This also means that you can create these entities on
 *      // the server and have them auto-stream to connected clients.
 *
 *      // To use an IgeAudioEntity, simply create an IgeAudioEntity instance
 *      // and mount it:
 *      const audioEntity = new IgeAudioEntity({audioSourceId: "mySound1"});
 *
 *      // You can then start playback via:
 *      audioEntity.play();
 *
 *      // Keep in mind that even if you call play, no audio will start
 *      // playback until after you have mounted the entity
 *      audioEntity.mount(myScene);
 *
 *      // Alternatively you can tell the entity to start playback as soon
 *      // as it's been mounted using the `playOnMount` constructor property:
 *      const audioEntity = new IgeAudioEntity({
 *          audioSourceId: "mySound1",
 *          playOnMount: true
 *      });
 *
 *      audioEntity.mount(myScene);
 */
export class IgeAudioController extends IgeAssetRegister<IgeAudioSource> implements IgeIsReadyPromise {
	classId = "IgeAudioController";
	masterVolumeNode: GainNode;
	_ctx?: AudioContext;
	_active: boolean = false;
	_disabled: boolean = false;
	_audioBufferStore: Record<string, AudioBuffer> = {};
	_playbackArr: IgeAudioControl[] = [];

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

		this.masterVolumeNode = this._ctx.createGain();
		this.masterVolumeNode.connect(this._ctx.destination);

		// Set listener orientation to match our 2d plane
		// The setOrientation() method is deprecated but still supported.
		// FireFox has (of writing) currently not provided any other way to set orientation,
		// so we must continue to use this method until that changes
		// TODO: Wait for Firefox to support accessor properties and then update this
		this.setListenerOrientation(Math.cos(0.1), 0, Math.sin(0.1), 0, 1, 0);

		this.log("Web audio API connected successfully");
	}

	isReady () {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				ige.dependencies.waitFor(["engine"], () => {
					// Register the engine behaviour that will get called at the end of any updates,
					// so we can check for entities we need to track and alter the panning of any
					// active audio to pan relative to the entity in question
					ige.engine.addBehaviour<IgeEngine>(IgeBehaviourType.postUpdate, "audioPanning", this._onPostUpdate);
					resolve();
				});
			}, 1);
		});
	}

	/**
	 * Sets the orientation of the audio listener.
	 *
	 * @param {number} x - The x-coordinate of the listener's forward direction vector.
	 * @param {number} y - The y-coordinate of the listener's forward direction vector.
	 * @param {number} z - The z-coordinate of the listener's forward direction vector.
	 * @param {number} xUp - The x-coordinate of the listener's up direction vector.
	 * @param {number} yUp - The y-coordinate of the listener's up direction vector.
	 * @param {number} zUp - The z-coordinate of the listener's up direction vector.
	 *
	 * @return {void}
	 * @see https://developer.mozilla.org/en-US/docs/web/api/audiolistener/setorientation
	 */
	setListenerOrientation (x: number, y: number, z: number, xUp: number, yUp: number, zUp: number): void {
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
	interact (): boolean {
		if (!this._ctx) return false;
		if (this._ctx.state !== "suspended") return true;

		void this._ctx.resume();
		return true;
	}

	/**
	 * Gets / sets the master volume for sound output.
	 * @param val
	 * @returns {*}
	 */
	masterVolume (val?: number): number | this | undefined {
		if (!this.masterVolumeNode) return;

		if (val !== undefined) {
			this.masterVolumeNode.gain.value = val;
			return this;
		}

		return this.masterVolumeNode.gain.value;
	}

	/**
	 * Returns an audio context.
	 * @returns {*}
	 */
	getContext (): AudioContext {
		return new window.AudioContext();
	}

	/**
	 * Plays audio by its assigned id and returns either a string
	 * id of the playback item that owns the audio playback for this
	 * request, or null if the playback failed or was unavailable.
	 *
	 * Once playback has ended the promise will resolve with `true`.
	 * @param {string} [audioSourceId] The id of the audio file to play.
	 * @param {IgeAudioPlaybackOptions} [options={}]
	 */
	play (audioSourceId?: string, options: IgeAudioPlaybackOptions = {}): string | null {
		if (!audioSourceId || !isClient || !this._ctx) {
			return null;
		}

		const audioControl = this.createAudioControl(audioSourceId, options);

		if (!audioControl) return null;
		audioControl.play();

		return audioControl._id;
	}

	startPlaybackItem (audioControlId: string) {
		const playbackItem = this.playbackControlById(audioControlId);
		if (!playbackItem) return this;

		playbackItem.play();
		return this;
	}

	stopPlaybackItem (audioControlId?: string) {
		if (!audioControlId) return;
		const playbackItem = this.playbackControlById(audioControlId);
		if (!playbackItem) return this;

		playbackItem.stop();
		return this;
	}

	createAudioControl (audioSourceId?: string, options: IgeAudioPlaybackOptions = {}): IgeAudioControl | null {
		if (!audioSourceId || !isClient || !this._ctx) {
			return null;
		}
		console.log("ige.audio, createAudioControl");
		const relativeTo = options.relativeTo;
		const onEnded = options.onEnded;
		const isPersistent = typeof options.isPersistent !== "undefined" ? options.isPersistent : false;
		const gain: number = typeof options.volume !== "undefined" ? options.volume : 1;
		const loop: boolean = typeof options.loop !== "undefined" ? options.loop : false;
		const pannerSettings = typeof options.pannerSettings !== "undefined" ? options.pannerSettings : defaultPannerSettings;

		const audioControl = new IgeAudioControl();
		audioControl.audioSourceId(audioSourceId);
		audioControl.loop(loop);
		audioControl.isPersistent(isPersistent);
		audioControl.relativeTo(relativeTo);
		audioControl.pannerSettings(pannerSettings);
		audioControl.volume(gain);
		audioControl.onEnded(() => {
			if (onEnded) {
				onEnded();
			}

			if (!isPersistent) {
				audioControl.destroy();
			}
		});

		this._playbackArr.push(audioControl);
		return audioControl;
	}

	removeAudioControl (audioControlId: string): IgeAudioControl | undefined {
		console.log("ige.audio, removeAudioControl");
		return arrPullConditional(this._playbackArr, (item) => item._id === audioControlId);
	}

	/**
	 * Retrieves a playback item from the internal playback array
	 * based on the passed audioControlId. If no item with that id exists
	 * on the array, `undefined` is returned instead.
	 * @param audioControlId
	 */
	playbackControlById (audioControlId: string): IgeAudioControl | undefined {
		return this._playbackArr.find((item) => item._id === audioControlId);
	}

	/**
	 * Sets the position of an existing playback item by its id.
	 * @param id
	 * @param position
	 */
	setPosition (id: string, position: IgePoint3d) {
		const audioControl = this.playbackControlById(id);
		if (!audioControl) return this;

		audioControl.position(position);
		return this;
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

	/**
	 * Asynchronously decodes audio data from an ArrayBuffer to an AudioBuffer.
	 *
	 * @param {string} url - The URL of the audio file.
	 * @param {ArrayBuffer} data - The audio data to be decoded.
	 * @returns {Promise<AudioBuffer>} A promise that resolves with the decoded audio data.
	 * @throws {Error} If decoding the audio data fails.
	 */
	async _loaded (url: string, data: ArrayBuffer): Promise<AudioBuffer | undefined> {
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
	_onPostUpdate = () => {
		this._playbackArr.forEach((audioControl) => {
			if (!audioControl._relativeTo || !audioControl._position || !audioControl._pannerNode) return;
			if (typeof audioControl._relativeTo === "string") {
				const ent = ige.$<IgeEntity>(audioControl._relativeTo);
				if (!ent) return;
				audioControl._relativeTo = ent;
			}

			const audioWorldPos = audioControl._position;
			const relativeToWorldPos = audioControl._relativeTo.worldPosition();
			const pannerNode = audioControl._pannerNode;

			// Update the audio origin position
			pannerNode.positionX.value = audioWorldPos.x - relativeToWorldPos.x;
			pannerNode.positionY.value = -audioWorldPos.y - -relativeToWorldPos.y;
			pannerNode.positionZ.value = audioWorldPos.z - relativeToWorldPos.z;
		});
	};
}
