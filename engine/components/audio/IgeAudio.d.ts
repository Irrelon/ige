import { IgeEventingClass } from "../../core/IgeEventingClass";
export declare class IgeAudio extends IgeEventingClass {
    classId: string;
    _url?: string;
    _buffer?: AudioBuffer;
    _bufferSource?: AudioBufferSourceNode;
    _playWhenReady: boolean;
    _loaded: boolean;
    _loop: boolean;
    _playing: boolean;
    _audioId?: string;
    _panner?: PannerNode;
    constructor(audioId?: string);
    playing(val?: boolean): boolean | this;
    audioId(audioId: string): this;
    audioId(): string;
    url(url: string): this;
    url(): string;
    /**
     * Gets / sets the current audio buffer.
     * @param {AudioBuffer} buffer
     * @returns {*}
     */
    buffer(buffer: AudioBuffer): this;
    buffer(): AudioBuffer;
    panner(val: PannerNode): this;
    panner(): PannerNode;
    /**
     * Plays the audio.
     */
    play(loop?: boolean): void;
    /**
     * Stops the currently playing audio.
     */
    stop(): void;
}
