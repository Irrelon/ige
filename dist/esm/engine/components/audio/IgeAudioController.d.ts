import { IgeAudioControl } from "./IgeAudioControl.js"
import type { IgeAudioSource } from "./IgeAudioSource.js";
import { IgeAssetRegister } from "../../core/IgeAssetRegister.js"
import type { IgePoint3d } from "../../core/IgePoint3d.js"
import type { IgeAudioPlaybackOptions } from "../../../types/IgeAudioPlaybackOptions.js"
import type { IgeIsReadyPromise } from "../../../types/IgeIsReadyPromise.js"
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
export declare class IgeAudioController extends IgeAssetRegister<IgeAudioSource> implements IgeIsReadyPromise {
    classId: string;
    masterVolumeNode: GainNode;
    _ctx?: AudioContext;
    _active: boolean;
    _disabled: boolean;
    _audioBufferStore: Record<string, AudioBuffer>;
    _playbackArr: IgeAudioControl[];
    constructor();
    isReady(): Promise<void>;
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
    setListenerOrientation(x: number, y: number, z: number, xUp: number, yUp: number, zUp: number): void;
    /**
     * When first instantiated the audio context might
     * be in a suspended state because the browser doesn't
     * let us play audio until the user interacts with the
     * elements on the page. This function should be called
     * in an event listener triggered by a user interaction
     * such as a click handler etc.
     */
    interact(): boolean;
    /**
     * Gets / sets the master volume for sound output.
     * @param val
     * @returns {*}
     */
    masterVolume(val?: number): number | this | undefined;
    /**
     * Returns an audio context.
     * @returns {*}
     */
    getContext(): AudioContext;
    /**
     * Plays audio by its assigned id and returns either a string
     * id of the playback item that owns the audio playback for this
     * request, or null if the playback failed or was unavailable.
     *
     * Once playback has ended the promise will resolve with `true`.
     * @param {string} [audioSourceId] The id of the audio file to play.
     * @param {IgeAudioPlaybackOptions} [options={}]
     */
    play(audioSourceId?: string, options?: IgeAudioPlaybackOptions): string | null;
    startPlaybackItem(audioControlId: string): this;
    stopPlaybackItem(audioControlId?: string): this | undefined;
    createAudioControl(audioSourceId?: string, options?: IgeAudioPlaybackOptions): IgeAudioControl | null;
    removeAudioControl(audioControlId: string): IgeAudioControl | undefined;
    /**
     * Retrieves a playback item from the internal playback array
     * based on the passed audioControlId. If no item with that id exists
     * on the array, `undefined` is returned instead.
     * @param audioControlId
     */
    playbackControlById(audioControlId: string): IgeAudioControl | undefined;
    /**
     * Sets the position of an existing playback item by its id.
     * @param id
     * @param position
     */
    setPosition(id: string, position: IgePoint3d): this;
    /**
     * Gets / sets the active flag to enable or disable audio support.
     * @param {boolean=} val True to enable audio support.
     * @returns {*}
     */
    active(val?: boolean): boolean | this;
    /**
     * Loads an audio file from the given url.
     * @param {string} url The url to load the audio file from.
     * file has loaded or on error.
     */
    _load(url: string): Promise<AudioBuffer>;
    /**
     * Asynchronously decodes audio data from an ArrayBuffer to an AudioBuffer.
     *
     * @param {string} url - The URL of the audio file.
     * @param {ArrayBuffer} data - The audio data to be decoded.
     * @returns {Promise<AudioBuffer>} A promise that resolves with the decoded audio data.
     * @throws {Error} If decoding the audio data fails.
     */
    _loaded(url: string, data: ArrayBuffer): Promise<AudioBuffer | undefined>;
    /**
     * Decodes audio data and calls back with an audio buffer.
     * @param {ArrayBuffer} data The audio data to decode.
     * @private
     */
    _decode: (data: ArrayBuffer) => Promise<AudioBuffer | undefined>;
    /**
     * Called after all engine update() scenegraph calls and loops the currently
     * playing audio to ensure that the panning of that audio matches the position
     * of the entity it should emit audio relative to.
     */
    _onPostUpdate: () => void;
}
