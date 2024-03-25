import type { IgeAudioSource } from "./IgeAudioSource.js"
import { IgeAssetRegister } from "../../core/IgeAssetRegister.js";
import type { IgeAudioPlaybackData } from "../../../types/IgeAudioPlaybackData.js"
import type { IgeAudioPlaybackOptions } from "../../../types/IgeAudioPlaybackOptions.js"
export declare class IgeAudioController extends IgeAssetRegister<IgeAudioSource> {
    classId: string;
    _active: boolean;
    _disabled: boolean;
    _ctx?: AudioContext;
    _masterVolumeNode: GainNode;
    _audioBufferStore: Record<string, AudioBuffer>;
    _playbackArr: IgeAudioPlaybackData[];
    constructor();
    setListenerOrientation(x: any, y: any, z: any, xUp: any, yUp: any, zUp: any): void;
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
     * Plays audio by its assigned id and returns a promise.
     * If the audio context is unavailable, or we are on the server,
     * the promise resolves immediately with a `false` value.
     *
     * Once playback has ended the promise will resolve with `true`.
     * @param {string} id The id of the audio file to play.
     * @param {IgeAudioPlaybackOptions} [options={}]
     */
    play(id: string, options?: IgeAudioPlaybackOptions): Promise<boolean>;
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
    _onPostUpdate(): void;
}
