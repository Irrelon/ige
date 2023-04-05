import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { IgeAudioItem } from "@/engine/audio/IgeAudioItem";
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { registerClass } from "@/engine/igeClassStore";

export interface IgeAudioEntityPanner extends PannerOptions {

}

export interface IgeAudioEntityOptions {
	started?: boolean;
	loop?: boolean;
	gain?: number;
	panner?: IgeAudioEntityPanner;
	relativeTo?: IgeEntity;
}

// Set default data for any audio panner node
const defaultPanner: IgeAudioEntityPanner = {
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
	_audioInterface?: IgeAudioItem;
	_options: IgeAudioEntityOptions = {
		started: false,
		loop: false,
		gain: 1,
		panner: defaultPanner
	};
	_relativeTo?: IgeEntity;
	_listener?: AudioListener;
	_panner?: PannerNode;
	_audioId?: string;

	constructor (audioId?: string, options: IgeAudioEntityOptions = {
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
				if (!this._audioInterface) return;
				this._audioInterface.play(this._options.loop);
			}, 1);
		}
	}

	relativeTo (val: IgeEntity): this;
	relativeTo (): IgeEntity | undefined;
	relativeTo (val?: IgeEntity) {
		if (val !== undefined) {
			const audioInterface = this.audioInterface();
			if (!audioInterface) return;
			if (!ige.audio || !ige.audio._ctx) return;

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
	playing () {
		return this.audioInterface()?.playing();
	}

	/**
	 * Gets / sets the url the audio is playing from.
	 * @param {string=} url The url that serves the audio file.
	 * @returns {IgeAudioEntity}
	 */
	url (url: string): this;
	url (): string;
	url (url?: string) {
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
	audioId (audioId?: string) {
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
	play (loop: boolean = false) {
		this.audioInterface()?.play(loop);
		return this;
	}

	/**
	 * Stops playback of the audio.
	 * @returns {IgeAudioEntity}
	 */
	stop () {
		this.audioInterface()?.stop();
		return this;
	}

	/**
	 * Gets / sets the IgeAudioItem instance used to control
	 * playback of the audio stream.
	 * @param {IgeAudioItem=} audio
	 * @returns {*}
	 */
	audioInterface (audio: IgeAudioItem): this;
	audioInterface (): IgeAudioItem | undefined;
	audioInterface (audio?: IgeAudioItem) {
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
	streamCreateConstructorArgs () {
		return [this._audioId, this._options];
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
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

		super.update(ctx, tickDelta);
	}

	/**
	 * Called when the entity is to be destroyed. Stops any
	 * current audio stream playback.
	 */
	destroy () {
		if (isClient) {
			this.audioInterface()?.stop();
		}

		super.destroy();
		return this;
	}
}

registerClass(IgeAudioEntity);
