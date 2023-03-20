import { ige } from "@/engine/instance";
import { IgeOptions } from "@/engine/core/IgeOptions";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeScene2d } from "@/engine/core/IgeScene2d";

// Include this here as we use it throughout the app
//require('./component/ui/InfoWindow');

export class AppClientScene extends IgeSceneGraph {
	classId = 'AppClientScene';

	addGraph () {
		// Get game options (or set defaults)
		const options = new IgeOptions();
		options.set("masterVolume", 1);
		ige.audio?.masterVolume(options.get('masterVolume', 1));

		// Intercept mouse interaction here - we only register this single listener here
		// and then route events to individual entity instances based on if they should
		// receive a mouse event or not

		// Hook the engine's input system and take over mouse interaction
		const _mouseUpHandle = ige.engine.components.input.on('preMouseUp', (event) => {
			// Get list of entities that the mouse is currently over
			const arr = ige.engine.pointerOverList();

			for (let i = 0; i < arr.length; i++) {
				const item = arr[i];
				if (item._pointerUp && item._pointerUp(event)) {
					return true;
				}
			}

			if (ige.client.playerEntity) {
				// No event handlers cancelled the event, tell the player entity to deselect
				// any target it currently has
				ige.client.playerEntity.selectTarget(null);
			}

			// Return true to stop this event from being emitted by the engine to the scenegraph
			return true;
		});

		const _mouseDownHandle = ige.engine.components.input.on('preMouseDown', (event) => {
			// Get list of entities that the mouse is currently over
			const arr = ige.engine.pointerOverList();

			for (let i = 0; i < arr.length; i++) {
				const item = arr[i];
				if (item._pointerDown && item._pointerDown(event)) {
					return true;
				}
			}

			// Return true to stop this event from being emitted by the engine to the scenegraph
			return true;
		});

		const _mouseMoveHandle = ige.engine.components.input.on('preMouseMove', (event) => {
			// Return true to stop this event from being emitted by the engine to the scenegraph
			return true;
		});

		const _contextMenuHandle = ige.engine.components.input.on('preContextMenu', (event) => {
			// Return true to stop this event from being emitted by the engine to the scenegraph
			return true;
		});

		// Create the root scene on which all other objects
		// will branch from in the scenegraph
		const mainScene = new IgeScene2d()
			.id('mainScene');

		// Create the main viewport and set the scene
		// it will "look" at as the new mainScene we just
		// created above
		new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(mainScene)
			.drawBounds(false)
			.mount(ige.engine);
	}

	removeGraph () {
		const mainScene = ige.$('mainScene');

		if (mainScene) {
			mainScene.destroy();
		}
	}
}
