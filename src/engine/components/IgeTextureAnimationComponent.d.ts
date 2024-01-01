import { IgeComponent } from "@/engine/core/IgeComponent";
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTextureAnimation } from "@/types/IgeTextureAnimation";
export interface IgeAnimationStartOptions {
    onComplete?: (anim: IgeTextureAnimation) => void;
    onLoop?: (anim: IgeTextureAnimation) => void;
    onStopped?: (anim: IgeTextureAnimation) => void;
}
/**
 * The animation component class. Handles defining and controlling
 * frame-based animations based on cells from a texture.
 * @event started - The animation starts.
 * @event stopped - The animation ends or is stopped.
 * @event loopComplete - The animation has completed a full cycle (shown all frames).
 * @event complete - The animation has completed all assigned loop cycles.
 */
export declare class IgeTextureAnimationComponent extends IgeComponent {
    classId: string;
    componentId: string;
    _anim?: IgeTextureAnimation;
    _anims: Record<string, IgeTextureAnimation>;
    _animCount: number;
    _animId?: string;
    _playing: boolean;
    _completeCallback?: (anim: IgeTextureAnimation) => void;
    _loopCallback?: (anim: IgeTextureAnimation) => void;
    _stoppedCallback?: (anim: IgeTextureAnimation) => void;
    /**
     * @constructor
     * @param {Object} entity The parent object that this component is being added to.
     * @param {Object=} options An optional object that is passed to the component when it is being initialised.
     */
    constructor(entity: IgeEntity, options?: any);
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
    define: (id: string, frames: (number | string | null)[], fps: number, loop: number, convertIdsToIndex?: boolean) => any;
    addFrame: (id: string, frameId: number | string) => void;
    removeFrame: (id: string, frameIndex: number) => void;
    /**
     * Removes a previously defined animation from the entity.
     * @param {string} id The id of the animation to remove.
     * @returns {*}
     */
    remove: (id: string) => any;
    /**
     * Returns true if the specified animation has been defined.
     * @param {string} id The id of the animation to check for.
     * @returns {boolean} True if the animation has been defined.
     */
    defined: (id: string) => boolean;
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
    setFps: (id: string, fps: number) => any;
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
    setAllFps: (fps: number) => any;
    /**
     * Checks the current animation state, either started
     * or stopped.
     * @return {boolean} True if an animation is currently playing
     * or false if not.
     */
    playing: () => boolean;
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
    start: (animId: string, options?: IgeAnimationStartOptions) => any;
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
    select: (animId: string, options?: IgeAnimationStartOptions) => any;
    /**
     * Stops the current animation.
     * @example #Stop the current animation
     *     entity.animation.stop();
     * @return {*}
     */
    stop: () => any;
    /**
     * Handles the animation processing each update.
     * @param {CanvasRenderingContext2D} ctx The rendering context to use when doing draw operations.
     * @param entity
     * @param {number} tickDelta The current ige._tickDelta passed down the scenegraph.
     */
    _update: (entity: IgeEntity, ctx: IgeCanvasRenderingContext2d, tickDelta: number) => void;
}
