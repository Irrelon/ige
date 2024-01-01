"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTextureAnimationComponent = void 0;
const instance_1 = require("../instance.js");
const IgeComponent_1 = require("../core/IgeComponent.js");
const IgeBehaviourType_1 = require("../../enums/IgeBehaviourType.js");
/**
 * The animation component class. Handles defining and controlling
 * frame-based animations based on cells from a texture.
 * @event started - The animation starts.
 * @event stopped - The animation ends or is stopped.
 * @event loopComplete - The animation has completed a full cycle (shown all frames).
 * @event complete - The animation has completed all assigned loop cycles.
 */
class IgeTextureAnimationComponent extends IgeComponent_1.IgeComponent {
    /**
     * @constructor
     * @param {Object} entity The parent object that this component is being added to.
     * @param {Object=} options An optional object that is passed to the component when it is being initialised.
     */
    constructor(entity, options) {
        super(entity, options);
        this.classId = "IgeTextureAnimationComponent";
        this.componentId = "animation";
        this._animCount = 0;
        this._playing = false;
        /**
         * Defines an animation specifying the frames to use, the
         * frames per second to animate at and if the animation
         * should loop and if so, how many times.
         * @param {string} id The unique animation id.
         * @param {Array} frames An array of cell numbers to animate through.
         * @param {number} fps The speed of the animation (frames per second).
         * @param {number} loop The number of times to loop the animation, or -1 to loop forever. Defaults to -1.
         * @param {boolean} convertIdsToIndex If true will convert cell ids to cell indexes to speed
         * up animation processing. This is true by default but should be disabled if you intend to
         * change the assigned texture of the entity that this animation is applied to after you have
         * defined the animation since the frame indexes will likely map to incorrect cells on a
         * different texture.
         * @example #Define an animation
         *     // Create an entity, add the animation component and define
         *     // an animation using frames 1, 2, 3 and 4, with an FPS of
         *     // 25 and looping forever (-1)
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         * @return {*}
         */
        this.define = (id, frames, fps, loop, convertIdsToIndex = true) => {
            if (frames && frames.length) {
                let i, frame;
                this._animCount = this._animCount || 0;
                if (convertIdsToIndex === undefined) {
                    convertIdsToIndex = true; // Default the flag to true if undefined
                }
                if (convertIdsToIndex) {
                    // Check each frame for string values
                    for (i = 0; i < frames.length; i++) {
                        frame = frames[i];
                        if (typeof (frame) === "string") {
                            if (this._entity._texture) {
                                // The frame has a cell id so convert to an index
                                frame = this._entity._texture.cellIdToIndex(frame);
                                frames[i] = frame;
                            }
                            else {
                                this.log("You can increase the performance of id-based cell animations by specifying the animation.define AFTER you have assigned your sprite sheet to the entity on entity with ID: " + this._entity.id(), "warning");
                                break;
                            }
                        }
                    }
                }
                // Store the animation
                const frameTime = ((1000 / fps) | 0);
                this._anims[id] = {
                    frames,
                    frameTime,
                    "loop": loop !== undefined ? loop : -1,
                    "frameCount": frames.length,
                    "totalTime": frames.length * frameTime,
                    "currentDelta": 0,
                    "currentLoop": 0
                };
                this._animCount++;
            }
            else {
                this.log("Cannot define an animation without a frame array!", "error");
            }
            return this._entity;
        };
        this.addFrame = (id, frameId) => {
            if (this._anims[id]) {
                const anim = this._anims[id];
                if (typeof (frameId) === "string") {
                    frameId = this._entity._texture.cellIdToIndex(frameId);
                }
                anim.frames.push(frameId);
                anim.frameCount++;
                anim.totalTime = anim.frames.length * anim.frameTime;
            }
        };
        this.removeFrame = (id, frameIndex) => {
            if (this._anims[id]) {
                const anim = this._anims[id];
                anim.frames.splice(frameIndex, 1);
                anim.frameCount--;
                anim.totalTime = anim.frames.length * anim.frameTime;
            }
        };
        /**
         * Removes a previously defined animation from the entity.
         * @param {string} id The id of the animation to remove.
         * @returns {*}
         */
        this.remove = (id) => {
            delete this._anims[id];
            this._animCount--;
            return this._entity;
        };
        /**
         * Returns true if the specified animation has been defined.
         * @param {string} id The id of the animation to check for.
         * @returns {boolean} True if the animation has been defined.
         */
        this.defined = (id) => {
            return Boolean(this._anims[id]);
        };
        /**
         * Sets the specified animation's FPS.
         * @param {string} id The ID of the animation to alter the FPS for.
         * @param {number=} fps The number of frames per second the animation
         * should play at.
         * @example #Set the specified animation's FPS
         *     // Create an entity, add the animation component and define
         *     // an animation with an FPS of 25
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *
         *     // Change the FPS to 12
         *     entity.animation.setFps('anim1', 12);
         * @return {*}
         */
        this.setFps = (id, fps) => {
            if (this._anims) {
                const anim = this._anims[id];
                if (anim) {
                    anim.frameTime = ((1000 / fps) | 0);
                    anim.totalTime = anim.frameCount * anim.frameTime;
                }
            }
            return this._entity;
        };
        /**
         * Sets all the animations assigned to an entity to the specified FPS.
         * @param {number=} fps The number of frames per second the animations
         * should play at.
         * @example #Set all entity animations to specified FPS
         *     // Create an entity, add the animation component and define
         *     // a couple of animations with an FPS of 25
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *         .animation.define('anim2', [5, 6, 7, 8], 25, -1);
         *
         *     // Change the FPS of all animations to 12
         *     entity.animation.setAllFps(12);
         * @return {*}
         */
        this.setAllFps = (fps) => {
            if (this._anims) {
                for (const id in this._anims) {
                    if (this._anims.hasOwnProperty(id)) {
                        this.setFps(id, fps);
                    }
                }
            }
            return this._entity;
        };
        /**
         * Checks the current animation state, either started
         * or stopped.
         * @return {boolean} True if an animation is currently playing
         * or false if not.
         */
        this.playing = () => {
            return this._playing;
        };
        /**
         * Starts an animation from the beginning frame.
         * @param {string} animId The id of the animation to start.
         * @param {Object=} options An object with some option properties.
         * @example #Start an animation
         *     // Create an entity, add the animation component, define
         *     // an animation and then start it
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *
         *     entity.animation.start('anim1');
         *
         * @example #Start an animation with callbacks for animation events
         *     // Create an entity, add the animation component, define
         *     // an animation and then start it
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *
         *     // In each animation callback...
         *     // this = the entity's animation component instance
         *     // anim = the animation component's _anim object
         *     // this._entity = the entity the animation is attached to
         *
         *     entity.animation.start('anim1', {
         *     		onLoop: function (anim) {
         *     			console.log('Animation looped', this, anim);
         *     		},
         *     		onStopped: function (anim) {
         *     			console.log('Animation stopped', this, anim);
         *     		},
         *     		onComplete: function (anim) {
         *     			console.log('Animation completed', this, anim);
         *     		}
         *     });
         *
         * @example #Start an animation with callbacks for animation events via event listeners
         *     // Create an entity, add the animation component, define
         *     // an animation and then start it
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *
         *     // In each animation callback...
         *     // this = the entity's animation component instance
         *     // anim = the animation component's _anim object
         *     // this._entity = the entity the animation is attached to
         *
         *     entity.animation.on('started', function (anim) {
         *     		console.log('Animation started', this, anim);
         *     });
         *
         *     entity.animation.on('loopComplete', function (anim) {
         *     		console.log('Animation looped', this, anim);
         *     });
         *
         *     entity.animation.on('stopped', function (anim) {
         *     		console.log('Animation stopped', this, anim);
         *     });
         *
         *     entity.animation.on('complete', function (anim) {
         *     		console.log('Animation complete', this, anim);
         *     });
         *
         *     entity.animation.start('anim1');
         * @return {*}
         */
        this.start = (animId, options) => {
            if (this._anims) {
                const anim = this._anims[animId];
                if (anim) {
                    anim.currentDelta = 0;
                    anim.currentLoop = 0;
                    anim.startTime = instance_1.ige.engine._currentTime;
                    this._anim = anim;
                    this._animId = animId;
                    // Check for any callbacks in the options object
                    if (options !== undefined) {
                        this._completeCallback = options.onComplete;
                        this._loopCallback = options.onLoop;
                        this._stoppedCallback = options.onStopped;
                    }
                    this._playing = true;
                    this.emit("started", anim);
                }
                else {
                    this.log(`Cannot set animation to "${animId}" because the animation does not exist!`, "warning");
                }
            }
            else {
                this.log(`Cannot set animation to "${animId}" because no animations have been defined with defineAnim(...);`, "warning");
            }
            return this._entity;
        };
        /**
         * Starts an animation only if the passed animation is not already
         * started.
         * @param {string} animId The id of the animation to start.
         * @param {Object=} options An object with some option properties.
         * @example #Select an animation
         *     // Create an entity, add the animation component, define
         *     // an animation and then select it
         *     var entity = new IgeEntity()
         *         .addComponent(IgeTextureAnimationComponent)
         *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
         *
         *     entity.animation.select('anim1');
         *
         *     // Selecting the same animation twice will NOT reset the
         *     // animation because it is already playing. This is how
         *     // select() differs from start()
         *     entity.animation.select('anim1');
         * @return {*}
         */
        this.select = (animId, options) => {
            if (this._animId !== animId) {
                this.start(animId, options);
            }
            return this._entity;
        };
        /**
         * Stops the current animation.
         * @example #Stop the current animation
         *     entity.animation.stop();
         * @return {*}
         */
        this.stop = () => {
            if (this._stoppedCallback) {
                this._stoppedCallback(this._anim);
            }
            this.emit("stopped", this._anim);
            this._playing = false;
            delete this._anim;
            delete this._animId;
            delete this._completeCallback;
            delete this._loopCallback;
            delete this._stoppedCallback;
            return this._entity;
        };
        /**
         * Handles the animation processing each update.
         * @param {CanvasRenderingContext2D} ctx The rendering context to use when doing draw operations.
         * @param entity
         * @param {number} tickDelta The current ige._tickDelta passed down the scenegraph.
         */
        this._update = (entity, ctx, tickDelta) => {
            // Just in case someone forgets to pass it in their update call!
            tickDelta = tickDelta || instance_1.ige.engine._tickDelta;
            if (this._anim) {
                const anim = this._anim;
                // Advance the internal animation timer
                anim.currentDelta += tickDelta;
                // Check if the animation timer is greater than the total animation time
                if (anim.currentDelta > anim.totalTime) {
                    // Check if we have a single loop animation
                    if (!anim.loop) {
                        if (this._completeCallback) {
                            this._completeCallback(anim);
                        }
                        this.emit("complete", anim);
                        this.stop();
                    }
                    else {
                        // Check if we have an infinite loop
                        if (anim.loop === -1) {
                            // Loop back round to the beginning
                            const multiple = anim.currentDelta / anim.totalTime;
                            if (Math.abs(multiple) > 1) {
                                anim.currentDelta -= ((multiple | 0) * anim.totalTime); // Bitwise floor
                            }
                            if (this._loopCallback) {
                                this._loopCallback(anim);
                            }
                            this.emit("loopComplete", anim);
                        }
                        else {
                            anim.currentLoop++;
                            if (anim.loop > 0 && anim.currentLoop <= anim.loop) {
                                // Loop back round to the beginning
                                const multiple = anim.currentDelta / anim.totalTime;
                                if (Math.abs(multiple) > 1) {
                                    anim.currentDelta -= ((multiple | 0) * anim.totalTime); // Bitwise floor
                                }
                                if (this._loopCallback) {
                                    this._loopCallback(anim);
                                }
                                this.emit("loopComplete", anim);
                            }
                            else {
                                // The animation has ended
                                if (this._completeCallback) {
                                    this._completeCallback(anim);
                                }
                                this.emit("complete", anim);
                                this.stop();
                            }
                        }
                    }
                }
                let frame = ((anim.currentDelta / anim.frameTime) | 0);
                if (frame >= anim.frameCount) {
                    frame = anim.frameCount - 1;
                }
                const cell = anim.frames[frame];
                // Set the current frame
                if (typeof cell === "string") {
                    this._entity.cellById(cell);
                }
                else {
                    this._entity.cell(cell);
                }
            }
        };
        this._anims = {};
        // Add the animation behaviour to the entity
        entity.addBehaviour(IgeBehaviourType_1.IgeBehaviourType.preUpdate, "tween", this._update);
    }
}
exports.IgeTextureAnimationComponent = IgeTextureAnimationComponent;
