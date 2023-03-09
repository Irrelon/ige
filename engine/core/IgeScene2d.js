import IgeEntity from "./IgeEntity.js";
import { ige } from "../instance.js";
/**
 * Creates a new 2d scene.
 */
class IgeScene2d extends IgeEntity {
    constructor() {
        super();
        this.classId = "IgeScene2d";
        /**
         * Gets / sets the stream room id. If set, any streaming entities that
         * are mounted to this scene will only sync with clients that have been
         * assigned to this room id.
         *
         * @param {String} id The id of the room.
         * @returns {*}
         */
        this.streamRoomId = (id) => {
            if (id !== undefined) {
                this._streamRoomId = id;
                return this;
            }
            return this._streamRoomId;
        };
        /**
         * Overrides the default entity stream sections to also stream important
         * data about scenes to the client.
         * @param sectionId
         * @param data
         * @returns {*}
         */
        this.streamSectionData = (sectionId, data) => {
            switch (sectionId) {
                case "ignoreCamera":
                    if (data !== undefined) {
                        // Setter
                        if (data === "false") {
                            this.ignoreCamera(false);
                        }
                        else {
                            this.ignoreCamera(true);
                        }
                    }
                    else {
                        // Getter
                        return String(this._ignoreCamera);
                    }
                    break;
                default:
                    super.streamSectionData(sectionId, data);
                    break;
            }
        };
        /**
         * Gets / sets the auto-size property. If set to true, the scene will
         * automatically resize to the engine's canvas geometry.
         * @param {Boolean=} val If true, will autosize the scene to match the
         * main canvas geometry. This is enabled by default and is unlikely to
         * help you if you switch it off.
         * @return {*}
         */
        this.autoSize = (val) => {
            if (typeof (val) !== "undefined") {
                this._autoSize = val;
                return this;
            }
            return this._autoSize;
        };
        /**
         * Gets / sets the _shouldRender property. If set to true, the scene's child
         * object's tick methods will be called.
         * @param {Boolean} val If set to false, no child entities will be rendered.
         * @return {Boolean}
         */
        this.shouldRender = (val) => {
            if (val !== undefined) {
                this._shouldRender = val;
                return this;
            }
            return this._shouldRender;
        };
        /**
         * Gets / sets the flag that determines if the scene will ignore camera
         * transform values allowing the scene to remain static on screen
         * regardless of the camera transform.
         * @param {Boolean=} val True to ignore, false to not ignore.
         * @return {*}
         */
        this.ignoreCamera = (val) => {
            if (val !== undefined) {
                this._ignoreCamera = val;
                return this;
            }
            return this._ignoreCamera;
        };
        this.update = (ctx, tickDelta) => {
            if (this._ignoreCamera) {
                // Translate the scene, so it is always center of the camera
                const cam = ige.engine._currentCamera;
                if (cam) {
                    this.translateTo(cam._translate.x, cam._translate.y, cam._translate.z);
                    this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
                    this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);
                    //this._localMatrix.multiply(ige._currentCamera._worldMatrix.getInverse());
                }
            }
            super.update(ctx, tickDelta);
        };
        /**
         * Handles screen resize events.
         * @param event
         * @private
         */
        this._resizeEvent = (event) => {
            // Set width / height of scene to match main ige (SCENES ARE ALWAYS THE FULL IGE SIZE!!)
            if (this._autoSize && ige.engine.root) {
                this._bounds2d = ige.engine.root._bounds2d.clone();
            }
            // Resize any children
            const arr = this._children;
            let arrCount = arr.length;
            while (arrCount--) {
                arr[arrCount]._resizeEvent(event);
            }
        };
        this._mouseAlwaysInside = true;
        this._alwaysInView = true;
        this._shouldRender = true;
        this._autoSize = true;
        // Set the geometry of the scene to the main canvas
        // width / height - used when positioning UI elements
        this._bounds2d.x = ige.engine.root._bounds2d.x;
        this._bounds2d.y = ige.engine.root._bounds2d.y;
        this.streamSections(["transform", "ignoreCamera"]);
    }
    /**
     * Processes the actions required each render frame.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     */
    tick(ctx) {
        if (this._shouldRender) {
            super.tick(ctx);
        }
    }
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String}
     */
    _stringify() {
        // Get the properties for all the super-classes
        let str = super._stringify(), i;
        // Loop properties and add property assignment code to string
        for (i in this) {
            // @ts-ignore
            if (this.hasOwnProperty(i) && this[i] !== undefined) {
                switch (i) {
                    case "_shouldRender":
                        str += ".shouldRender(" + this.shouldRender() + ")";
                        break;
                    case "_autoSize":
                        str += ".autoSize(" + this.autoSize() + ")";
                        break;
                }
            }
        }
        return str;
    }
}
export default IgeScene2d;
