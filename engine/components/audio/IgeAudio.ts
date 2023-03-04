import { ige } from "../../instance";
import IgeEventingClass from "../../core/IgeEventingClass";
import IgeAudioComponent from "./IgeAudioComponent";
import { IgeRegisterable } from "../../../types/IgeRegisterable";

class IgeAudio extends IgeEventingClass implements IgeRegisterable {
	classId = "IgeAudio";
	_registered: boolean = false;
	_id?: string;
	_url?: string;
	_data?: ArrayBuffer;
	_buffer?: AudioBuffer;

	constructor (url?: string) {
		super();

		if (!url) { return; }
		void this.load(url).then(this._loaded);
	}

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id The id to set to.
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id (): string;
	id (id: string): this;
	id (id?: string): this | string | undefined {
		if (id !== undefined) {
			// Check if this ID already exists in the object register
			if (ige._register[id]) {
				if (ige._register[id] === this) {
					// We are already registered as this id
					return this;
				}

				// Already an object with this ID!
				this.log(`Cannot set ID of object to "${id}" because that ID is already in use by another object!`, "error");
			} else {
				// Check if we already have an id assigned
				if (this._id && ige._register[this._id]) {
					// Unregister the old ID before setting this new one
					ige.unRegister(this);
				}

				this._id = id;

				// Now register this object with the object register
				ige.register(this);

				return this;
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			if (this._url) {
				// Generate an ID from the URL string of the audio file
				// this instance is using. Useful for always reproducing
				// the same ID for the same file :)
				this._id = ige.newIdFromString(this._url);
			} else {
				// We don't have a URL so generate a random ID
				this._id = ige.newIdHex();
			}
			ige.register(this);
		}

		return this._id;
	}

	/**
	 * Loads an audio file from the given url.
	 * @param {String} url The url to load the audio file from.
	 * @param {Function=} callback Optional callback method to call when the audio
	 * file has loaded or on error.
	 */
	async load (url: string) {
		return new Promise<ArrayBuffer>((resolve, reject) => {
			const request = new XMLHttpRequest();

			request.open("GET", url, true);
			request.responseType = "arraybuffer";

			// Decode asynchronously
			request.onload = () => {
				this._data = request.response as ArrayBuffer;
				this._url = url;

				resolve(request.response as ArrayBuffer);
			};

			request.onerror = (err) => {
				reject(err);
			};

			request.send();
		});
	}

	async _loaded (data: ArrayBuffer) {
		return (ige.components.audio as IgeAudioComponent).decode(data)
			.then((buffer) => {
				this._buffer = buffer;
				(ige.components.audio as IgeAudioComponent).log(`Audio file (${this._url}) loaded successfully`);

				this.emit("loaded");
			}).catch((err: any) => {
				throw new Error(`Failed to decode audio "${this._url}": ${err}`);
			});
	}

	/**
	 * Plays the audio.
	 */
	play () {
		if (!this._buffer) {
			// Wait for the audio to load
			this.on("loaded", () => {
				this.play();
			});

			return;
		}

		const bufferSource = (ige.components.audio as IgeAudioComponent)._ctx.createBufferSource();
		bufferSource.buffer = this._buffer;
		bufferSource.connect((ige.components.audio as IgeAudioComponent)._ctx.destination);
		bufferSource.start(0);
	}
}

export default IgeAudio;
