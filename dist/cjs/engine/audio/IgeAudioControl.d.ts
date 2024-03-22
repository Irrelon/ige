import { IgeEventingClass } from "../core/IgeEventingClass.js"
/**
 * Handles controlling an audio source.
 * You can use an instance of IgeAudioControl to
 * start or stop playback of audio.
 */
export declare class IgeAudioControl extends IgeEventingClass {
    classId: string;
    _buffer?: AudioBuffer;
    _bufferSource?: AudioBufferSourceNode;
    _playWhenReady: boolean;
    _loop: boolean;
    _playing: boolean;
    _panner?: PannerNode;
    _audioSourceId?: string;
    constructor(audioSourceId?: string);
    playing(val?: boolean): boolean | this;
    /**
     * Gets or sets the audioSourceId for this item. If setting an audioSourceId,
     * you must first have created the audio source with the global audio
     * controller via `new IgeAudioSource(audioSourceId, url);`.
     * @param {string} [audioSourceId]
     */
    audioSourceId(): string;
    audioSourceId(audioSourceId: string): this;
    /**
     * Gets / sets the current audio buffer.
     * @param {AudioBuffer} [buffer]
     * @returns {*}
     */
    buffer(): AudioBuffer;
    buffer(buffer: AudioBuffer): this;
    panner(val: PannerNode): this;
    panner(): PannerNode;
    /**
     * Plays the audio.
     */
    play(loop?: boolean): void;
    loop(): boolean;
    loop(loop: boolean): this;
    /**
     * Stops the currently playing audio.
     */
    stop(): void;
}
