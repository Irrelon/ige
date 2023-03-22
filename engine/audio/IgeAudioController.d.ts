import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
export declare class IgeAudioController extends IgeEventingClass {
    classId: string;
    _active: boolean;
    _disabled: boolean;
    _register: Record<string, AudioBuffer>;
    _ctx?: AudioContext;
    _masterVolumeNode: GainNode;
    constructor();
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
     * Gets / loads an audio file from the given url and assigns it the id specified
     * in the global audio register.
     * @param {String} id The id to assign the audio in the register.
     * @param url
     */
    register(id: string, url: string): this;
    register(id: string): AudioBuffer;
    /**
     * Plays audio by its assigned id.
     * @param {String} id The id of the audio file to play.
     * @param {Boolean} loop If true, will loop the audio until
     * it is explicitly stopped.
     */
    play(id: string, loop?: boolean): void;
    /**
     * Gets / sets the active flag to enable or disable audio support.
     * @param {Boolean=} val True to enable audio support.
     * @returns {*}
     */
    active(val?: boolean): boolean | this;
    /**
     * Loads an audio file from the given url.
     * @param {String} url The url to load the audio file from.
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
}
