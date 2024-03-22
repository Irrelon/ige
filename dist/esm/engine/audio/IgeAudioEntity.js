import { IgeAudioControl } from "./IgeAudioControl.js"
import { IgeEntity } from "../core/IgeEntity.js";
import { ige } from "../instance.js"
import { isClient } from "../utils/clientServer.js";
import { registerClass } from "../utils/igeClassStore.js"
// Set default data for any audio panner node
export const defaultPannerSettings = {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 100,
    rolloffFactor: 1,
    maxDistance: 10000,
    coneOuterAngle: 360,
    coneInnerAngle: 360,
    coneOuterGain: 0
};
/**
 * Creates an audio entity that automatically handles
 * controlling panning / positioning of sound based on
 * where it is located on the screen in relation to
 * the listener / player. Also supports entity streaming
 * so an IgeAudioEntity can be instantiated server-side
 * and then be synced over the network to clients.
 *
 * If you only want to play audio and don't need to
 * position it in the simulation, an IgeAudioEntity is
 * overkill. You can use an IgeAudioControl instance instead.
 * The IgeAudioEntity uses an IgeAudioControl under the
 * hood anyway.
 */
export class IgeAudioEntity extends IgeEntity {
    classId = "IgeAudioEntity";
    _audioControl;
    _playing = false;
    _loop = false;
    _gain = 1;
    _pannerSettings = defaultPannerSettings;
    _relativeTo;
    _listener;
    _panner;
    _audioSourceId;
    constructor(props = {}) {
        super();
        const { audioId = "", playing = false, loop = false, gain = 1, pannerSettings = defaultPannerSettings, relativeTo = "" } = props;
        console.log("Creating IgeAudioEntity with args", props);
        if (audioId) {
            this._audioSourceId = audioId;
            this._audioControl = new IgeAudioControl(audioId);
        }
        if (gain !== undefined) {
            this._gain = gain;
        }
        if (pannerSettings !== undefined) {
            this._pannerSettings = pannerSettings;
        }
        if (loop !== undefined) {
            this.loop(loop);
        }
        if (relativeTo) {
            if (typeof relativeTo === "string") {
                this.relativeTo(ige.$(relativeTo));
            }
            else {
                this.relativeTo(relativeTo);
            }
        }
        if (playing) {
            // We take this out of process so that there is time
            // to handle other calls that may modify the audio
            // before playback starts
            setTimeout(() => {
                if (!this._audioControl)
                    return;
                this._audioControl.play(this._loop);
            }, 1);
        }
    }
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     */
    streamCreateConstructorArgs() {
        return [{
                audioId: this._audioSourceId || "",
                playing: this._playing,
                loop: this._loop,
                gain: this._gain,
                pannerSettings: this._pannerSettings,
                relativeTo: this._relativeTo?.id() || ""
            }];
    }
    onStreamProperty(propName, propVal) {
        super.onStreamProperty(propName, propVal);
        console.log("STREAM PROP", propName, propVal);
        switch (propName) {
            case "audioId":
                this.audioSourceId(propVal);
                break;
            case "playing":
                if (propVal === true) {
                    this.play();
                }
                else {
                    this.stop();
                }
                break;
            case "loop":
                this.loop(propVal);
                break;
            case "gain":
                this.gain(propVal);
                break;
            case "pannerSettings":
                this._pannerSettings = propVal;
                break;
            case "relativeTo":
                this.relativeTo(propVal);
                break;
        }
        return this;
    }
    relativeTo(val) {
        if (val !== undefined) {
            const audioInterface = this.audioControl();
            if (!audioInterface)
                return;
            if (!ige.audio || !ige.audio._ctx)
                return;
            this._relativeTo = val;
            this._listener = ige.audio._ctx.listener;
            // Check if we have a panner node yet or not
            if (!audioInterface.panner()) {
                // Create a panner node for the audio output
                this._panner = new PannerNode(ige.audio._ctx, this._pannerSettings);
                this.audioControl()?.panner(this._panner);
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
        return this._playing;
    }
    audioSourceId(id) {
        if (id === undefined) {
            return this.audioControl()?.audioSourceId();
        }
        this._audioSourceId = id;
        this.audioControl()?.audioSourceId(id);
        return this;
    }
    gain(gain) {
        if (gain === undefined) {
            return this._gain;
        }
        this._gain = gain;
        this.streamProperty("gain", gain);
        return this;
    }
    loop(loop) {
        if (loop === undefined) {
            return this._loop;
        }
        this._loop = loop;
        this.audioControl()?.loop(loop);
        this.streamProperty("loop", loop);
        return this;
    }
    /**
     * Starts playback of the audio.
     * @param {boolean} loop If true, loops the audio until
     * explicitly stopped by calling stop() or the entity
     * being destroyed.
     * @returns {IgeAudioEntity}
     */
    play(loop = false) {
        this._playing = true;
        this.loop(loop);
        this.audioControl()?.play(loop);
        this.streamProperty("playing", true);
        this.streamProperty("loop", loop);
        return this;
    }
    /**
     * Stops playback of the audio.
     * @returns {IgeAudioEntity}
     */
    stop() {
        this.audioControl()?.stop();
        this.streamProperty("playing", false);
        return this;
    }
    audioControl(audio) {
        if (audio !== undefined) {
            this._audioControl = audio;
            return this;
        }
        return this._audioControl;
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
            this.audioControl()?.stop();
        }
        super.destroy();
        return this;
    }
}
registerClass(IgeAudioEntity);
