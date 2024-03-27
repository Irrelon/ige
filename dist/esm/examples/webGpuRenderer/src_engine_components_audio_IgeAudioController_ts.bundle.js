"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_irrelon_ige"] = self["webpackChunk_irrelon_ige"] || []).push([["src_engine_components_audio_IgeAudioController_ts"],{

/***/ "./src/engine/components/audio/IgeAudioControl.ts":
/*!********************************************************!*\
  !*** ./src/engine/components/audio/IgeAudioControl.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IgeAudioControl: () => (/* binding */ IgeAudioControl)\n/* harmony export */ });\n/* harmony import */ var _engine_core_IgeEventingClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/engine/core/IgeEventingClass */ \"./src/engine/core/IgeEventingClass.ts\");\n/* harmony import */ var _engine_instance__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/engine/instance */ \"./src/engine/instance.ts\");\n/* harmony import */ var _engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/engine/utils/clientServer */ \"./src/engine/utils/clientServer.ts\");\n/* harmony import */ var _engine_utils_ids__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/engine/utils/ids */ \"./src/engine/utils/ids.ts\");\n/* harmony import */ var _engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/engine/utils/synthesize */ \"./src/engine/utils/synthesize.ts\");\n\n\n\n\n\n/**\n * Handles controlling an audio source. You can use an instance of\n * IgeAudioControl to start or stop playback of audio, but usually\n * you would do this directly via `ige.audio.play()` or by using\n * an `IgeAudioEntity` to allow streaming and further manipulation.\n */\nclass IgeAudioControl extends _engine_core_IgeEventingClass__WEBPACK_IMPORTED_MODULE_0__.IgeEventingClass {\n    constructor() {\n        super();\n        this.classId = \"IgeAudioControl\";\n        this._bufferNode = null;\n        this._shouldPlayWhenReady = false;\n        this._isPersistent = false;\n        this._loop = false;\n        this._isPlaying = false;\n        this._resumePlaybackOffset = 0;\n        this._startTime = 0;\n        this._id = (0,_engine_utils_ids__WEBPACK_IMPORTED_MODULE_3__.newIdHex)();\n        console.log(\"IgeAudioControl create\", this._id);\n        if (!_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio) {\n            if (_engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_2__.isServer) {\n                throw new Error(\"Cannot instantiate an IgeAudioControl on the server!\");\n            }\n            throw new Error(`The audio subsystem is not present, did you add the audio controller via ige.uses(\"audio\")?`);\n        }\n        if (!_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx) {\n            throw new Error(\"Cannot instantiate an IgeAudioControl without an audio context!\");\n        }\n        // We are going to create a node graph like this:\n        // buffer -> this volume (gain) -> panner -> master volume (gain) -> speaker output\n        this._pannerNode = new PannerNode(_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx, this._pannerSettings);\n        this._pannerNode.connect(_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.masterVolumeNode);\n        this._gainNode = new GainNode(_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx);\n        this._gainNode.connect(this._pannerNode);\n        this._bufferNode = new AudioBufferSourceNode(_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx);\n        this._bufferNode.connect(this._gainNode);\n    }\n    volume(val) {\n        if (val === undefined) {\n            return this._gainNode.gain.value;\n        }\n        this._gainNode.gain.value = val;\n        return this;\n    }\n    audioSourceId(audioSourceId) {\n        if (audioSourceId === undefined) {\n            return this._audioSourceId;\n        }\n        this._audioSourceId = audioSourceId;\n        if (!_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio || _engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_2__.isServer)\n            return this;\n        const audioItem = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.get(audioSourceId);\n        if (!audioItem || !audioItem.buffer) {\n            throw new Error(`The audio asset with id ${audioSourceId} does not exist. Add it with \\`new IgeAudioSource(audioSourceId, url);\\` first!`);\n        }\n        this._audioSourceBuffer = audioItem.buffer;\n        if (this.shouldPlayWhenReady()) {\n            this.play();\n        }\n        return this;\n    }\n    /**\n     * Plays the audio.\n     */\n    play(playbackFromOffset) {\n        if (!_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio)\n            return;\n        if (!this._audioSourceBuffer || !_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx) {\n            this.shouldPlayWhenReady(true);\n            return;\n        }\n        if (this.isPlaying())\n            return;\n        // Create our buffer source node\n        this._bufferNode = new AudioBufferSourceNode(_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx);\n        this._bufferNode.connect(this._gainNode);\n        this._bufferNode.buffer = this._audioSourceBuffer;\n        this._bufferNode.loop = this._loop;\n        if (playbackFromOffset) {\n            // Start playback from the designated location\n            this._bufferNode.start(0, playbackFromOffset);\n            this._resumePlaybackOffset = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx.currentTime - playbackFromOffset;\n        }\n        else {\n            // Start playback from our resume location\n            this._bufferNode.start(0, this._resumePlaybackOffset);\n            this._resumePlaybackOffset = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx.currentTime - this._resumePlaybackOffset;\n            if (this._startTime) {\n                this._startTime = this._startTime + (_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx.currentTime - this._startTime);\n            }\n            else {\n                this._startTime = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx.currentTime;\n            }\n        }\n        // Set internal playing flag\n        this.isPlaying(true);\n        // Check if we need to do anything when playback ends\n        if (this._onEnded) {\n            this._bufferNode.onended = this._onEnded;\n        }\n        this.log(`Audio file (${this._audioSourceId}) playing...`);\n    }\n    loop(loop) {\n        if (loop === undefined) {\n            return this._loop;\n        }\n        this._loop = loop;\n        if (this._bufferNode) {\n            this._bufferNode.loop = loop;\n        }\n        return this;\n    }\n    /**\n     * Similar to stop but will keep the current payback progress / location\n     * and when play() is called, playback will resume from the current\n     * location. If you pause() then stop() then play(), playback will start\n     * from the beginning again. Calling stop() will reset the playback\n     * location to the start of the audio track.\n     */\n    pause() {\n        if (this._bufferNode) {\n            this.log(`Audio file (${this._audioSourceId}) stopping...`);\n            this._bufferNode.stop(0);\n            this._bufferNode.disconnect();\n            if (_engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx) {\n                this._resumePlaybackOffset = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio._ctx.currentTime - this._resumePlaybackOffset;\n            }\n            this._bufferNode = null;\n        }\n        this.shouldPlayWhenReady(false);\n        this.isPlaying(false);\n    }\n    /**\n     * Stops the currently playing audio.\n     */\n    stop() {\n        this.log(`Audio file (${this._audioSourceId}) stopping...`);\n        if (this._bufferNode) {\n            this._bufferNode.stop(0);\n            this._bufferNode.disconnect();\n            this._bufferNode = null;\n        }\n        this._resumePlaybackOffset = 0;\n        this._startTime = 0;\n        this.shouldPlayWhenReady(false);\n        this.isPlaying(false);\n    }\n    /**\n     * Called when the audio control is to be destroyed. Stops any\n     * current audio stream playback.\n     */\n    destroy() {\n        var _a, _b, _c;\n        console.log(\"IgeAudioControl destroy\", this._id);\n        this.stop();\n        (_a = this._pannerNode) === null || _a === void 0 ? void 0 : _a.disconnect();\n        (_b = this._gainNode) === null || _b === void 0 ? void 0 : _b.disconnect();\n        (_c = this._bufferNode) === null || _c === void 0 ? void 0 : _c.disconnect();\n        _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.removeAudioControl(this._id);\n        return this;\n    }\n}\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"isPersistent\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"isPlaying\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"shouldPlayWhenReady\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"relativeTo\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"onEnded\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"pannerSettings\");\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioControl, \"position\");\n\n\n//# sourceURL=webpack://@irrelon/ige/./src/engine/components/audio/IgeAudioControl.ts?");

/***/ }),

/***/ "./src/engine/components/audio/IgeAudioController.ts":
/*!***********************************************************!*\
  !*** ./src/engine/components/audio/IgeAudioController.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IgeAudioController: () => (/* binding */ IgeAudioController)\n/* harmony export */ });\n/* harmony import */ var _engine_components_audio_IgeAudioControl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/engine/components/audio/IgeAudioControl */ \"./src/engine/components/audio/IgeAudioControl.ts\");\n/* harmony import */ var _engine_components_audio_IgeAudioEntity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/engine/components/audio/IgeAudioEntity */ \"./src/engine/components/audio/IgeAudioEntity.ts\");\n/* harmony import */ var _engine_core_IgeAssetRegister__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/engine/core/IgeAssetRegister */ \"./src/engine/core/IgeAssetRegister.ts\");\n/* harmony import */ var _engine_instance__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/engine/instance */ \"./src/engine/instance.ts\");\n/* harmony import */ var _engine_utils_arrays__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/engine/utils/arrays */ \"./src/engine/utils/arrays.ts\");\n/* harmony import */ var _engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/engine/utils/clientServer */ \"./src/engine/utils/clientServer.ts\");\n/* harmony import */ var _enums__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @/enums */ \"./src/enums/index.ts\");\nvar __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\n\n\n\n\n\n\n\n/**\n * This class is a component that you use by telling the engine it's a\n * dependency by calling `ige.uses(\"audio\");`. After that, you can directly\n * play back audio by first creating an audio source and then calling play()\n * with the source id.\n *\n * @example Load an audio source from an .mp3 file and play it\n *      // Load a .mp3 file as an audio source\n *      new IgeAudioSource(\"mySound1\", \"./assets/audio/someAudioFile.mp3\");\n *\n *      // Now playback the audio\n *      ige.audio.play(\"mySound1\");\n *\n * @example Play a sound at a specific position on the sound stage\n *      ige.audio.play(\"mySound1\", {position: {x: 10, y: 5: z: 0}});\n *\n * @example Make the sound play relative to a player entity\n *      // If we have a player entity with the id \"player\", tell the sound\n *      // to play at a position and set the player entity as the point that\n *      // the audio should pan relative to. The audio will pan automatically\n *      // as the player's entity location changes.\n *      const player = ige.$(\"player\");\n *      ige.audio.play(\"mySound1\", {\n *          position: {x: 10, y: 5: z: 0},\n *          relativeTo: player // <- Notice we make the sound relative to the player\n *      });\n *\n *      // Now, if you move the player entity to the left of the sound\n *      // the audio will \"pan\" to the right of the player e.g.\n *      player.translateTo(0, 5, 0);\n *\n *      // The player is now at x:0 and the sound is at x:10. Because of\n *      // this, the sound should be coming from the right of the player.\n *      // To hear the sound from the left of the player, we can move it\n *      // again so the player is to the right of the sound (x > 10):\n *      player.translateTo(20, 5, 0);\n *\n * @example Persistent sounds at a location\n *      // Often is it useful to place a sound emitter at a static location\n *      // in a scene and as the player gets closer to the sound, the sound\n *      // becomes more audible as it's volume increases with reduced distance\n *      // to the sound source. In this case, you can either use the same\n *      // concept as the above examples but set the `loop` option to true,\n *      // or you can create an audio entity that gets mounted to the scene\n *      // like any other entity and has all the same properties as a normal\n *      // entity does. This also means that you can create these entities on\n *      // the server and have them auto-stream to connected clients.\n *\n *      // To use an IgeAudioEntity, simply create an IgeAudioEntity instance\n *      // and mount it:\n *      const audioEntity = new IgeAudioEntity({audioSourceId: \"mySound1\"});\n *\n *      // You can then start playback via:\n *      audioEntity.play();\n *\n *      // Keep in mind that even if you call play, no audio will start\n *      // playback until after you have mounted the entity\n *      audioEntity.mount(myScene);\n *\n *      // Alternatively you can tell the entity to start playback as soon\n *      // as it's been mounted using the `playOnMount` constructor property:\n *      const audioEntity = new IgeAudioEntity({\n *          audioSourceId: \"mySound1\",\n *          playOnMount: true\n *      });\n *\n *      audioEntity.mount(myScene);\n */\nclass IgeAudioController extends _engine_core_IgeAssetRegister__WEBPACK_IMPORTED_MODULE_2__.IgeAssetRegister {\n    constructor() {\n        super();\n        this.classId = \"IgeAudioController\";\n        this._active = false;\n        this._disabled = false;\n        this._audioBufferStore = {};\n        this._playbackArr = [];\n        /**\n         * Decodes audio data and calls back with an audio buffer.\n         * @param {ArrayBuffer} data The audio data to decode.\n         * @private\n         */\n        this._decode = (data) => __awaiter(this, void 0, void 0, function* () {\n            if (!this._ctx)\n                return;\n            return this._ctx.decodeAudioData(data);\n        });\n        /**\n         * Called after all engine update() scenegraph calls and loops the currently\n         * playing audio to ensure that the panning of that audio matches the position\n         * of the entity it should emit audio relative to.\n         */\n        this._onPostUpdate = () => {\n            this._playbackArr.forEach((audioControl) => {\n                if (!audioControl._relativeTo || !audioControl._position || !audioControl._pannerNode)\n                    return;\n                if (typeof audioControl._relativeTo === \"string\") {\n                    const ent = _engine_instance__WEBPACK_IMPORTED_MODULE_3__.ige.$(audioControl._relativeTo);\n                    if (!ent)\n                        return;\n                    audioControl._relativeTo = ent;\n                }\n                const audioWorldPos = audioControl._position;\n                const relativeToWorldPos = audioControl._relativeTo.worldPosition();\n                const pannerNode = audioControl._pannerNode;\n                // Update the audio origin position\n                pannerNode.positionX.value = audioWorldPos.x - relativeToWorldPos.x;\n                pannerNode.positionY.value = -audioWorldPos.y - -relativeToWorldPos.y;\n                pannerNode.positionZ.value = audioWorldPos.z - relativeToWorldPos.z;\n            });\n        };\n        this._active = false;\n        this._disabled = false;\n        this._ctx = this.getContext();\n        if (!this._ctx) {\n            this.log(\"No web audio API support, audio is disabled!\");\n            this._disabled = true;\n        }\n        if (this._ctx.state === \"suspended\") {\n            this.log(\"Audio support is available, waiting for user interaction to be allowed to play audio\");\n        }\n        this.masterVolumeNode = this._ctx.createGain();\n        this.masterVolumeNode.connect(this._ctx.destination);\n        // Set listener orientation to match our 2d plane\n        // The setOrientation() method is deprecated but still supported.\n        // FireFox has (of writing) currently not provided any other way to set orientation,\n        // so we must continue to use this method until that changes\n        // TODO: Wait for Firefox to support accessor properties and then update this\n        this.setListenerOrientation(Math.cos(0.1), 0, Math.sin(0.1), 0, 1, 0);\n        this.log(\"Web audio API connected successfully\");\n    }\n    isReady() {\n        return new Promise((resolve) => {\n            setTimeout(() => {\n                _engine_instance__WEBPACK_IMPORTED_MODULE_3__.ige.dependencies.waitFor([\"engine\"], () => {\n                    // Register the engine behaviour that will get called at the end of any updates,\n                    // so we can check for entities we need to track and alter the panning of any\n                    // active audio to pan relative to the entity in question\n                    _engine_instance__WEBPACK_IMPORTED_MODULE_3__.ige.engine.addBehaviour(_enums__WEBPACK_IMPORTED_MODULE_6__.IgeBehaviourType.postUpdate, \"audioPanning\", this._onPostUpdate);\n                    resolve();\n                });\n            }, 1);\n        });\n    }\n    /**\n     * Sets the orientation of the audio listener.\n     *\n     * @param {number} x - The x-coordinate of the listener's forward direction vector.\n     * @param {number} y - The y-coordinate of the listener's forward direction vector.\n     * @param {number} z - The z-coordinate of the listener's forward direction vector.\n     * @param {number} xUp - The x-coordinate of the listener's up direction vector.\n     * @param {number} yUp - The y-coordinate of the listener's up direction vector.\n     * @param {number} zUp - The z-coordinate of the listener's up direction vector.\n     *\n     * @return {void}\n     * @see https://developer.mozilla.org/en-US/docs/web/api/audiolistener/setorientation\n     */\n    setListenerOrientation(x, y, z, xUp, yUp, zUp) {\n        if (!this._ctx) {\n            this.log(\"Cannot set listener orientation, the audio context is not initialised\", \"warning\");\n            return;\n        }\n        this._ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);\n    }\n    /**\n     * When first instantiated the audio context might\n     * be in a suspended state because the browser doesn't\n     * let us play audio until the user interacts with the\n     * elements on the page. This function should be called\n     * in an event listener triggered by a user interaction\n     * such as a click handler etc.\n     */\n    interact() {\n        if (!this._ctx)\n            return false;\n        if (this._ctx.state !== \"suspended\")\n            return true;\n        void this._ctx.resume();\n        return true;\n    }\n    /**\n     * Gets / sets the master volume for sound output.\n     * @param val\n     * @returns {*}\n     */\n    masterVolume(val) {\n        if (!this.masterVolumeNode)\n            return;\n        if (val !== undefined) {\n            this.masterVolumeNode.gain.value = val;\n            return this;\n        }\n        return this.masterVolumeNode.gain.value;\n    }\n    /**\n     * Returns an audio context.\n     * @returns {*}\n     */\n    getContext() {\n        return new window.AudioContext();\n    }\n    /**\n     * Plays audio by its assigned id and returns either a string\n     * id of the playback item that owns the audio playback for this\n     * request, or null if the playback failed or was unavailable.\n     *\n     * Once playback has ended the promise will resolve with `true`.\n     * @param {string} [audioSourceId] The id of the audio file to play.\n     * @param {IgeAudioPlaybackOptions} [options={}]\n     */\n    play(audioSourceId, options = {}) {\n        if (!audioSourceId || !_engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_5__.isClient || !this._ctx) {\n            return null;\n        }\n        const audioControl = this.createAudioControl(audioSourceId, options);\n        if (!audioControl)\n            return null;\n        audioControl.play();\n        return audioControl._id;\n    }\n    startPlaybackItem(audioControlId) {\n        const playbackItem = this.playbackControlById(audioControlId);\n        if (!playbackItem)\n            return this;\n        playbackItem.play();\n        return this;\n    }\n    stopPlaybackItem(audioControlId) {\n        if (!audioControlId)\n            return;\n        const playbackItem = this.playbackControlById(audioControlId);\n        if (!playbackItem)\n            return this;\n        playbackItem.stop();\n        return this;\n    }\n    createAudioControl(audioSourceId, options = {}) {\n        if (!audioSourceId || !_engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_5__.isClient || !this._ctx) {\n            return null;\n        }\n        console.log(\"ige.audio, createAudioControl\");\n        const relativeTo = options.relativeTo;\n        const onEnded = options.onEnded;\n        const isPersistent = typeof options.isPersistent !== \"undefined\" ? options.isPersistent : false;\n        const gain = typeof options.volume !== \"undefined\" ? options.volume : 1;\n        const loop = typeof options.loop !== \"undefined\" ? options.loop : false;\n        const pannerSettings = typeof options.pannerSettings !== \"undefined\" ? options.pannerSettings : _engine_components_audio_IgeAudioEntity__WEBPACK_IMPORTED_MODULE_1__.defaultPannerSettings;\n        const audioControl = new _engine_components_audio_IgeAudioControl__WEBPACK_IMPORTED_MODULE_0__.IgeAudioControl();\n        audioControl.audioSourceId(audioSourceId);\n        audioControl.loop(loop);\n        audioControl.isPersistent(isPersistent);\n        audioControl.relativeTo(relativeTo);\n        audioControl.pannerSettings(pannerSettings);\n        audioControl.volume(gain);\n        audioControl.onEnded(() => {\n            if (onEnded) {\n                onEnded();\n            }\n            if (!isPersistent) {\n                audioControl.destroy();\n            }\n        });\n        this._playbackArr.push(audioControl);\n        return audioControl;\n    }\n    removeAudioControl(audioControlId) {\n        console.log(\"ige.audio, removeAudioControl\");\n        return (0,_engine_utils_arrays__WEBPACK_IMPORTED_MODULE_4__.arrPullConditional)(this._playbackArr, (item) => item._id === audioControlId);\n    }\n    /**\n     * Retrieves a playback item from the internal playback array\n     * based on the passed audioControlId. If no item with that id exists\n     * on the array, `undefined` is returned instead.\n     * @param audioControlId\n     */\n    playbackControlById(audioControlId) {\n        return this._playbackArr.find((item) => item._id === audioControlId);\n    }\n    /**\n     * Sets the position of an existing playback item by its id.\n     * @param id\n     * @param position\n     */\n    setPosition(id, position) {\n        const audioControl = this.playbackControlById(id);\n        if (!audioControl)\n            return this;\n        audioControl.position(position);\n        return this;\n    }\n    /**\n     * Gets / sets the active flag to enable or disable audio support.\n     * @param {boolean=} val True to enable audio support.\n     * @returns {*}\n     */\n    active(val) {\n        if (val !== undefined && !this._disabled) {\n            this._active = val;\n            return this;\n        }\n        return this._active;\n    }\n    /**\n     * Loads an audio file from the given url.\n     * @param {string} url The url to load the audio file from.\n     * file has loaded or on error.\n     */\n    _load(url) {\n        return __awaiter(this, void 0, void 0, function* () {\n            this.log(`Request to load audio file (${url})...`);\n            return new Promise((resolve, reject) => {\n                const request = new XMLHttpRequest();\n                request.open(\"GET\", url, true);\n                request.responseType = \"arraybuffer\";\n                // Decode asynchronously\n                request.onload = () => {\n                    this._loaded(url, request.response)\n                        .then((buffer) => {\n                        if (!buffer) {\n                            return reject(new Error(\"Could not create audio buffer\"));\n                        }\n                        resolve(buffer);\n                    })\n                        .catch((err) => {\n                        reject(err);\n                    });\n                };\n                request.onerror = (err) => {\n                    reject(err);\n                };\n                request.send();\n            });\n        });\n    }\n    /**\n     * Asynchronously decodes audio data from an ArrayBuffer to an AudioBuffer.\n     *\n     * @param {string} url - The URL of the audio file.\n     * @param {ArrayBuffer} data - The audio data to be decoded.\n     * @returns {Promise<AudioBuffer>} A promise that resolves with the decoded audio data.\n     * @throws {Error} If decoding the audio data fails.\n     */\n    _loaded(url, data) {\n        return __awaiter(this, void 0, void 0, function* () {\n            return this._decode(data)\n                .then((buffer) => {\n                return buffer;\n            })\n                .catch((err) => {\n                throw new Error(`Failed to decode audio \"${url}\": ${err}`);\n            });\n        });\n    }\n}\n\n\n//# sourceURL=webpack://@irrelon/ige/./src/engine/components/audio/IgeAudioController.ts?");

/***/ }),

/***/ "./src/engine/components/audio/IgeAudioEntity.ts":
/*!*******************************************************!*\
  !*** ./src/engine/components/audio/IgeAudioEntity.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IgeAudioEntity: () => (/* binding */ IgeAudioEntity),\n/* harmony export */   defaultPannerSettings: () => (/* binding */ defaultPannerSettings)\n/* harmony export */ });\n/* harmony import */ var _engine_core_IgeEntity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/engine/core/IgeEntity */ \"./src/engine/core/IgeEntity.ts\");\n/* harmony import */ var _engine_instance__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/engine/instance */ \"./src/engine/instance.ts\");\n/* harmony import */ var _engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/engine/utils/clientServer */ \"./src/engine/utils/clientServer.ts\");\n/* harmony import */ var _engine_utils_igeClassStore__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/engine/utils/igeClassStore */ \"./src/engine/utils/igeClassStore.ts\");\n/* harmony import */ var _engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/engine/utils/synthesize */ \"./src/engine/utils/synthesize.ts\");\n\n\n\n\n\n// Set default data for any audio panner node\nconst defaultPannerSettings = {\n    panningModel: \"HRTF\",\n    distanceModel: \"inverse\",\n    refDistance: 100,\n    rolloffFactor: 1,\n    maxDistance: 10000,\n    coneOuterAngle: 360,\n    coneInnerAngle: 360,\n    coneOuterGain: 0\n};\n/**\n * Creates an audio entity that automatically handles\n * controlling panning / positioning of sound based on\n * where it is located on the screen in relation to\n * the listener / player. Also supports entity streaming\n * so an IgeAudioEntity can be instantiated server-side\n * and then be synced over the network to clients.\n *\n * If you only want to play audio and don't need to\n * position it in the simulation, an IgeAudioEntity is\n * overkill. You can use an IgeAudioControl instance instead.\n * The IgeAudioEntity uses an IgeAudioControl under the\n * hood anyway. This class is also designed for persistent\n * sound sources rather than incidental ones. If you are\n * looking to create incidental sound at a location you\n * can call the ige.audio.play() function instead.\n *\n * @see IgeAudioController.play()\n */\nclass IgeAudioEntity extends _engine_core_IgeEntity__WEBPACK_IMPORTED_MODULE_0__.IgeEntity {\n    constructor(props = {}) {\n        super();\n        this.classId = \"IgeAudioEntity\";\n        this._isPlaying = false;\n        this._playOnMount = false;\n        this._loop = false;\n        this._volume = 1;\n        this._pannerSettings = defaultPannerSettings;\n        const { audioId = \"\", playOnMount = false, loop = false, volume = 1, pannerSettings = defaultPannerSettings } = props;\n        console.log(\"Creating IgeAudioEntity with args\", props);\n        this.audioSourceId(audioId);\n        this.pannerSettings(pannerSettings);\n        this.playOnMount(playOnMount);\n        this.volume(volume);\n        this.loop(loop);\n    }\n    /**\n     * Returns the data sent to each client when the entity\n     * is created via the network stream.\n     */\n    streamCreateConstructorArgs() {\n        return [{\n                audioId: this._audioSourceId || \"\",\n                pannerSettings: this._pannerSettings,\n                playOnMount: this._playOnMount,\n                loop: this._loop,\n                volume: this._volume\n            }];\n    }\n    onStreamProperty(propName, propVal) {\n        super.onStreamProperty(propName, propVal);\n        switch (propName) {\n            case \"audioId\":\n                this.audioSourceId(propVal);\n                break;\n            case \"pannerSettings\":\n                this.pannerSettings(propVal);\n                break;\n            case \"playOnMount\":\n                this.playOnMount(propVal);\n                break;\n            case \"loop\":\n                this.loop(propVal);\n                break;\n            case \"volume\":\n                this.volume(propVal);\n                break;\n            case \"isPlaying\":\n                if (propVal === true) {\n                    void this.play();\n                }\n                else {\n                    this.stop();\n                }\n                break;\n        }\n        return this;\n    }\n    /**\n     * Starts playback of the audio.\n     * @returns {IgeAudioEntity}\n     */\n    play() {\n        // If we're not yet mounted, set the playOnMount flag instead\n        // so that when we get mounted, playback will start automatically\n        this.playOnMount(true);\n        if (!this.isMounted()) {\n            return this;\n        }\n        this.isPlaying(true);\n        // Start playback using the audio controller component\n        const playbackItem = _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.createAudioControl(this._audioSourceId, {\n            loop: this._loop,\n            volume: this._volume,\n            pannerSettings: this._pannerSettings,\n            relativeTo: this,\n            isPersistent: true\n        });\n        if (playbackItem === null)\n            return this;\n        this._playbackControlId = playbackItem._id;\n        playbackItem.play();\n        return this;\n    }\n    /**\n     * Stops playback of the audio.\n     * @returns {IgeAudioEntity}\n     */\n    stop() {\n        this.isPlaying(false);\n        _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.stopPlaybackItem(this._playbackControlId);\n        return this;\n    }\n    update(tickDelta) {\n        if (_engine_utils_clientServer__WEBPACK_IMPORTED_MODULE_2__.isServer || !this._audioSourceId) {\n            return super.update(tickDelta);\n        }\n        _engine_instance__WEBPACK_IMPORTED_MODULE_1__.ige.audio.setPosition(this._audioSourceId, this.worldPosition());\n        return super.update(tickDelta);\n    }\n    /**\n     * Called when the entity is to be destroyed. Stops any\n     * current audio stream playback.\n     */\n    destroy() {\n        this.stop();\n        super.destroy();\n        return this;\n    }\n    _mounted(obj) {\n        super._mounted(obj);\n        // If the playOnMount flag is true, start playback\n        if (this._playOnMount) {\n            void this.play();\n        }\n    }\n    _unMounted(obj) {\n        void this.stop();\n        super._unMounted(obj);\n    }\n}\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"playOnMount\", true);\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"pannerSettings\", true);\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"audioSourceId\", true);\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"volume\", true);\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"loop\", true);\n(0,_engine_utils_synthesize__WEBPACK_IMPORTED_MODULE_4__.synthesize)(IgeAudioEntity, \"isPlaying\", true);\n(0,_engine_utils_igeClassStore__WEBPACK_IMPORTED_MODULE_3__.registerClass)(IgeAudioEntity);\n\n\n//# sourceURL=webpack://@irrelon/ige/./src/engine/components/audio/IgeAudioEntity.ts?");

/***/ }),

/***/ "./src/engine/utils/synthesize.ts":
/*!****************************************!*\
  !*** ./src/engine/utils/synthesize.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   synthesize: () => (/* binding */ synthesize)\n/* harmony export */ });\nfunction synthesize(Class, methodName, shouldStreamChange = false) {\n    const privatePropertyName = `_${methodName}`;\n    Class.prototype[methodName] = function (val) {\n        if (val === undefined) {\n            return this[privatePropertyName];\n        }\n        this[privatePropertyName] = val;\n        if (shouldStreamChange) {\n            this.streamProperty(methodName, val);\n        }\n        return this;\n    };\n}\n\n\n//# sourceURL=webpack://@irrelon/ige/./src/engine/utils/synthesize.ts?");

/***/ })

}]);