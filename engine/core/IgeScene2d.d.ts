import { IgeEntity } from "./IgeEntity";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
/**
 * Creates a new 2d scene.
 */
export declare class IgeScene2d extends IgeEntity {
    classId: string;
    _shouldRender: boolean;
    _autoSize: boolean;
    _mouseAlwaysInside: boolean;
    _alwaysInView: boolean;
    constructor();
    /**
     * Gets / sets the stream room id. If set, any streaming entities that
     * are mounted to this scene will only sync with clients that have been
     * assigned to this room id.
     *
     * @param {String} id The id of the room.
     * @returns {*}
     */
    streamRoomId: (id?: string) => string | this | undefined;
    /**
     * Overrides the default entity stream sections to also stream important
     * data about scenes to the client.
     * @param sectionId
     * @param data
     * @returns {*}
     */
    streamSectionData: (sectionId: string, data: string) => string | undefined;
    /**
     * Gets / sets the auto-size property. If set to true, the scene will
     * automatically resize to the engine's canvas geometry.
     * @param {Boolean=} val If true, will autosize the scene to match the
     * main canvas geometry. This is enabled by default and is unlikely to
     * help you if you switch it off.
     * @return {*}
     */
    autoSize: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the _shouldRender property. If set to true, the scene's child
     * object's tick methods will be called.
     * @param {Boolean} val If set to false, no child entities will be rendered.
     * @return {Boolean}
     */
    shouldRender: (val?: boolean) => boolean | this;
    /**
     * Gets / sets the flag that determines if the scene will ignore camera
     * transform values allowing the scene to remain static on screen
     * regardless of the camera transform.
     * @param {Boolean=} val True to ignore, false to not ignore.
     * @return {*}
     */
    ignoreCamera: (val?: boolean) => boolean | this;
    update: (ctx: IgeCanvasRenderingContext2d, tickDelta: number) => void;
    /**
     * Processes the actions required each render frame.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     */
    tick(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Handles screen resize events.
     * @param event
     * @private
     */
    _resizeEvent: (event?: Event) => void;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String}
     */
    _stringify(): string;
}
