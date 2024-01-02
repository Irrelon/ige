let appCore = require("../../../ige"),
	galaxyData;

require("../component/JumpGate");
galaxyData = require("../data/galaxy");

appCore.module("StationServerScene", function (ige, $ige, $game, $textures, IgeEventingClass, IgeScene2d) {
	const moduleSelf = this;

	const StationServerScene = IgeEventingClass.extend({
		classId: "StationServerScene",

		init: function () {},

		addGraph: function (options) {
			let systemData, station, jumpGate, i;

			if (ige.isServer) {
				ige.app.scene.sceneBase = new IgeScene2d().id("sceneBase").mount(ige.app.scene.mainScene);

				ige.app.scene.backScene = new IgeScene2d().id("backScene").layer(0).mount(ige.app.scene.sceneBase);

				ige.app.scene.frontScene = new IgeScene2d().id("frontScene").layer(1).mount(ige.app.scene.sceneBase);

				// Read the galaxy data for this system
				systemData = galaxyData.system[moduleSelf.$controller._systemId];

				// Create stations
				if (systemData.station) {
					for (i = 0; i < systemData.station.length; i++) {
						station = systemData.station[i];

						new StationStation()
							.id(station._id)
							.translateTo(station.position[0], station.position[1], station.position[2])
							.streamMode(1)
							.mount(ige.app.scene.frontScene);
					}
				}

				// Create jump gates
				if (systemData.jumpGate) {
					for (i = 0; i < systemData.jumpGate.length; i++) {
						jumpGate = systemData.jumpGate[i];

						new JumpGate()
							.id(jumpGate._id)
							.translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
							.streamMode(1)
							.mount(ige.app.scene.frontScene);
					}
				}

				/*self.generateAsteroidBelt(800, 0);*/
			}
		},

		removeGraph: function () {
			let i;

			if (ige.$("sceneBase")) {
				ige.$("sceneBase").destroy();

				// Clear any references
				for (i in ige.app.scene) {
					if (ige.app.scene.hasOwnProperty(i)) {
						if (!ige.app.scene[i].alive()) {
							delete ige.app.scene[i];
						}
					}
				}
			}
		}
	});

	return StationServerScene;
});
