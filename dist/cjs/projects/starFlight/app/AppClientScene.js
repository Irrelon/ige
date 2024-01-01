"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppClientScene = void 0;
const instance_1 = require("../../../engine/instance.js");
const IgeOptions_1 = require("../../../engine/core/IgeOptions.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
const IgeViewport_1 = require("../../../engine/core/IgeViewport.js");
const IgeScene2d_1 = require("../../../engine/core/IgeScene2d.js");
const IgeVelocityComponent_1 = require("../../../engine/components/IgeVelocityComponent.js");
// Include this here as we use it throughout the app
//require('./component/ui/InfoWindow');
class AppClientScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'AppClientScene';
    }
    addGraph() {
        var _a;
        // Get game options (or set defaults)
        const options = new IgeOptions_1.IgeOptions();
        options.set("masterVolume", 1);
        (_a = instance_1.ige.audio) === null || _a === void 0 ? void 0 : _a.masterVolume(options.get('masterVolume', 1));
        // Intercept mouse interaction here - we only register this single listener here
        // and then route events to individual entity instances based on if they should
        // receive a mouse event or not
        // Hook the engine's input system and take over mouse interaction
        const _mouseUpHandle = instance_1.ige.input.on('prePointerUp', (event) => {
            // Get list of entities that the mouse is currently over
            const arr = instance_1.ige.engine.pointerOverList();
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (item._pointerUp && item._pointerUp(event)) {
                    return true;
                }
            }
            if (instance_1.ige.client.playerEntity) {
                // No event handlers cancelled the event, tell the player entity to deselect
                // any target it currently has
                instance_1.ige.client.playerEntity.selectTarget(null);
            }
            // Return true to stop this event from being emitted by the engine to the scenegraph
            return true;
        });
        const _mouseDownHandle = instance_1.ige.input.on('preMouseDown', (event) => {
            // Get list of entities that the mouse is currently over
            const arr = instance_1.ige.engine.pointerOverList();
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (item._pointerDown && item._pointerDown(event)) {
                    return true;
                }
            }
            // Return true to stop this event from being emitted by the engine to the scenegraph
            return true;
        });
        const _mouseMoveHandle = instance_1.ige.input.on('preMouseMove', (event) => {
            // Return true to stop this event from being emitted by the engine to the scenegraph
            return true;
        });
        const _contextMenuHandle = instance_1.ige.input.on('preContextMenu', (event) => {
            // Return true to stop this event from being emitted by the engine to the scenegraph
            return true;
        });
        // Create the root scene on which all other objects
        // will branch from in the scenegraph
        const mainScene = new IgeScene2d_1.IgeScene2d()
            .id('mainScene');
        // Create the main viewport and set the scene
        // it will "look" at as the new mainScene we just
        // created above
        const vp1 = new IgeViewport_1.IgeViewport()
            .id('vp1')
            .autoSize(true)
            .scene(mainScene)
            .drawBounds(false)
            .mount(instance_1.ige.engine);
        vp1.camera.addComponent("velocity", IgeVelocityComponent_1.IgeVelocityComponent);
    }
    removeGraph() {
        const mainScene = instance_1.ige.$('mainScene');
        if (mainScene) {
            mainScene.destroy();
        }
    }
}
exports.AppClientScene = AppClientScene;
