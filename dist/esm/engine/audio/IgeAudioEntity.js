import { IgeAudioItem } from "./IgeAudioItem.js"
import { IgeEntity } from "../core/IgeEntity.js"
import { ige } from "../instance.js"
import { isClient } from "../utils/clientServer.js"
import { registerClass } from "../utils/igeClassStore.js"
// Set default data for any audio panner node
const defaultPanner = {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 100,
    rolloffFactor: 1,
    maxDistance: 10000,
    coneOuterAngle: 360,
    coneInnerAngle: 360,
    coneOuterGain: 0
};
export class IgeAudioEntity extends IgeEntity {
    classId = "IgeAudioEntity";
    _audioInterface;
    _options = {
        started: false,
        loop: false,
        gain: 1,
        panner: defaultPanner
    };
    _relativeTo;
    _listener;
    _panner;
    _audioId;
    constructor(audioId, options = {
        started: false,
        loop: false,
        gain: 1,
        panner: defaultPanner
    }) {
        super();
        this._audioId = audioId;
        this._audioInterface = new IgeAudioItem(audioId);
        this._options = options;
        if (this._options.relativeTo) {
            this.relativeTo(this._options.relativeTo);
        }
        if (this._options.started) {
            // We take this out of process so that there is time
            // to handle other calls that may modify the audio
            // before playback starts
            setTimeout(() => {
                if (!this._audioInterface)
                    return;
                this._audioInterface.play(this._options.loop);
            }, 1);
        }
    }
    relativeTo(val) {
        if (val !== undefined) {
            const audioInterface = this.audioInterface();
            if (!audioInterface)
                return;
            if (!ige.audio || !ige.audio._ctx)
                return;
            this._relativeTo = val;
            this._listener = ige.audio._ctx.listener;
            // Check if we have a panner node yet or not
            if (!audioInterface.panner()) {
                // Create a panner node for the audio output
                this._panner = new PannerNode(ige.audio._ctx, this._options.panner);
                this.audioInterface()?.panner(this._panner);
            }
            return this;
        }
        return this._relativeTo;
    }
    /**
     * Gets the playing boolean flag state.
     * @returns {boolean} True if playing, false if not.
     */
    playing() {
        return this.audioInterface()?.playing();
    }
    url(url) {
        if (url !== undefined) {
            this.audioInterface()?.url(url);
            return this;
        }
        return this.audioInterface()?.url();
    }
    /**
     * Gets / sets the id of the audio stream to use for
     * playback.
     * @param {string=} audioId The audio id. Must match
     * a previously registered audio stream that was
     * registered via IgeAudioComponent.register(). You can
     * access the audio component via ige.engine.audio
     * once you have added it as a component to use in the
     * engine.
     * @returns {*}
     */
    audioId(audioId) {
        if (audioId !== undefined) {
            this.audioInterface()?.audioId(audioId);
            return this;
        }
        return this.audioInterface()?.audioId();
    }
    /**
     * Starts playback of the audio.
     * @param {boolean} loop If true, loops the audio until
     * explicitly stopped by calling stop() or the entity
     * being destroyed.
     * @returns {IgeAudioEntity}
     */
    play(loop = false) {
        this.audioInterface()?.play(loop);
        return this;
    }
    /**
     * Stops playback of the audio.
     * @returns {IgeAudioEntity}
     */
    stop() {
        this.audioInterface()?.stop();
        return this;
    }
    audioInterface(audio) {
        if (audio !== undefined) {
            this._audioInterface = audio;
            return this;
        }
        return this._audioInterface;
    }
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     * @returns {*}
     */
    streamCreateConstructorArgs() {
        return [this._audioId, this._options];
    }
    update(tickDelta) {
        if (this._relativeTo && this._panner) {
            const audioWorldPos = this.worldPosition();
            const relativeToWorldPos = this._relativeTo.worldPosition();
            // Update the audio origin position
            if (this._panner) {
                this._panner.positionX.value = audioWorldPos.x;
                this._panner.positionY.value = -audioWorldPos.y;
                this._panner.positionZ.value = audioWorldPos.z;
            }
            // Update the listener
            if (this._listener) {
                this._listener.positionX.value = relativeToWorldPos.x;
                this._listener.positionY.value = -relativeToWorldPos.y;
                this._listener.positionZ.value = relativeToWorldPos.z;
            }
        }
        super.update(tickDelta);
    }
    /**
     * Called when the entity is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy() {
        if (isClient) {
            this.audioInterface()?.stop();
        }
        super.destroy();
        return this;
    }
}
registerClass(IgeAudioEntity);
