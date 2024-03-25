import { IgeEntity } from "../../core/IgeEntity.js"
import { ige } from "../../instance.js"
import { isServer } from "../../utils/clientServer.js"
import { registerClass } from "../../utils/igeClassStore.js"
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
 * hood anyway. This class is also designed for persistent
 * sound sources rather than incidental ones. If you are
 * looking to create incidental sound at a location you
 * can call the ige.audio.play() function instead.
 *
 * @see IgeAudioController.play()
 */
export class IgeAudioEntity extends IgeEntity {
    classId = "IgeAudioEntity";
    _isPlaying = false;
    _playOnMount = false;
    _loop = false;
    _volume = 1;
    _pannerSettings = defaultPannerSettings;
    _relativeTo;
    _panner;
    _audioSourceId;
    _playbackControlId;
    constructor(props = {}) {
        super();
        const { audioId = "", playOnMount = false, loop = false, volume = 1, pannerSettings = defaultPannerSettings, relativeTo = "" } = props;
        console.log("Creating IgeAudioEntity with args", props);
        this.audioSourceId(audioId);
        this.pannerSettings(pannerSettings);
        this.playOnMount(playOnMount);
        this.relativeTo(relativeTo);
        this.volume(volume);
        this.loop(loop);
    }
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     */
    streamCreateConstructorArgs() {
        return [{
                audioId: this._audioSourceId || "",
                relativeTo: this._relativeTo || "",
                pannerSettings: this._pannerSettings,
                playOnMount: this._playOnMount,
                loop: this._loop,
                volume: this._volume
            }];
    }
    onStreamProperty(propName, propVal) {
        super.onStreamProperty(propName, propVal);
        switch (propName) {
            case "audioId":
                this.audioSourceId(propVal);
                break;
            case "relativeTo":
                this.relativeTo(propVal);
                break;
            case "pannerSettings":
                this.pannerSettings(propVal);
                break;
            case "playOnMount":
                this.playOnMount(propVal);
                break;
            case "loop":
                this.loop(propVal);
                break;
            case "volume":
                this.volume(propVal);
                break;
            case "isPlaying":
                if (propVal === true) {
                    void this.play();
                }
                else {
                    this.stop();
                }
                break;
        }
        return this;
    }
    playOnMount(val) {
        if (val === undefined) {
            return this._playOnMount;
        }
        this._playOnMount = val;
        this.streamProperty("playOnMount", val);
        return this;
    }
    pannerSettings(val) {
        if (val === undefined) {
            return this._pannerSettings;
        }
        this._pannerSettings = val;
        this.streamProperty("pannerSettings", val);
        return this;
    }
    relativeTo(val) {
        if (val === undefined) {
            return this._relativeTo;
        }
        this._relativeTo = val;
        this.streamProperty("relativeTo", val);
        return this;
    }
    /**
     * Gets the playing state.
     * @returns {boolean} True if playing, false if not.
     */
    isPlaying() {
        return this._isPlaying;
    }
    audioSourceId(val) {
        if (val === undefined) {
            return this._audioSourceId;
        }
        this._audioSourceId = val;
        this.streamProperty("audioSourceId", val);
        return this;
    }
    volume(val) {
        if (val === undefined) {
            return this._volume;
        }
        this._volume = val;
        this.streamProperty("volume", val);
        return this;
    }
    loop(val) {
        if (val === undefined) {
            return this._loop;
        }
        this._loop = val;
        this.streamProperty("loop", val);
        return this;
    }
    /**
     * Starts playback of the audio.
     * @returns {IgeAudioEntity}
     */
    play() {
        // If we're not yet mounted, set the playOnMount flag instead
        // so that when we get mounted, playback will start automatically
        if (!this.isMounted()) {
            this.playOnMount(true);
            return null;
        }
        this.streamProperty("isPlaying", true);
        // Start playback using the audio controller component
        const playbackItem = ige.audio.createPlaybackControl(this._audioSourceId, {
            loop: this._loop,
            volume: this._volume,
            pannerSettings: this._pannerSettings,
            relativeTo: this._relativeTo,
            isPersistent: true
        });
        if (playbackItem === null)
            return null;
        this._playbackControlId = playbackItem._id;
        ige.audio.startPlaybackItem(this._playbackControlId);
        return this;
    }
    /**
     * Stops playback of the audio.
     * @returns {IgeAudioEntity}
     */
    stop() {
        this._isPlaying = false;
        this.streamProperty("isPlaying", false);
        return this;
    }
    update(tickDelta) {
        if (isServer || !this._relativeTo || !this._panner || !this._audioSourceId) {
            return super.update(tickDelta);
        }
        ige.audio.setPosition(this._audioSourceId, this.worldPosition());
        return super.update(tickDelta);
    }
    /**
     * Called when the entity is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy() {
        this.stop();
        super.destroy();
        return this;
    }
    _mounted(obj) {
        super._mounted(obj);
        // If the playOnMount flag is true, start playback
        if (this._playOnMount) {
            void this.play();
        }
    }
    _unMounted(obj) {
        void this.stop();
        super._unMounted(obj);
    }
}
registerClass(IgeAudioEntity);
