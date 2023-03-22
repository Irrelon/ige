import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";

import {Asteroid} from "../component/Asteroid";
import { distance } from "@/engine/utils";
import { SpaceStation } from "../component/SpaceStation";
import { JumpGate } from "../component/JumpGate";
import { systems } from "../data/systems";
//require("../component/JumpGate");
//require("../component/Asteroid");

export const generateAsteroidBelt = function generateAsteroidBelt (beltX: number, beltY: number) {
	const asteroidArr = [];
	const maxDist = 900;
	const minDist = 500;
	const max = 100;

	let count = 0;
	let asteroid;

	while (count < max) {
		if (!asteroid) {
			asteroid = new Asteroid();
			asteroid.mount(ige.game.scene.middleScene);
		}

		const x = Math.floor(beltX + ((Math.random() * maxDist * 2) - maxDist));
		const y = Math.floor(beltY + ((Math.random() * maxDist * 2) - maxDist));
		const dist = distance(x, y, beltX, beltY);

		if (dist > minDist && dist < maxDist) {
			asteroid.translateTo(x, y, 0);
			asteroid.updateTransform();
			let rejectedLocation = false;

			// Make sure no asteroids intersect this one
			for (let i = 0; i < asteroidArr.length; i++) {
				if (asteroidArr[i].aabb().intersects(asteroid.aabb(true))) {
					// The asteroid intersects another, reject this location
					rejectedLocation = true;
					break;
				}
			}

			if (!rejectedLocation) {
				asteroid.streamMode(1);
				asteroidArr.push(asteroid);
				asteroid = undefined;

				count++;
			}
		}
	}
};

export class SpaceServerScene extends IgeSceneGraph {
	classId = "SpaceServerScene";

	addGraph () {
		let systemData,
			station,
			jumpGate,
			asteroidBelt,
			i;

		if (isServer) {
			ige.game.scene.sceneBase = new IgeScene2d()
				.id("sceneBase")
				.mount(ige.game.scene.mainScene);

			ige.game.scene.backScene = new IgeScene2d()
				.id("backScene")
				.layer(0)
				.mount(ige.game.scene.sceneBase);

			ige.game.scene.middleScene = new IgeScene2d()
				.id("middleScene")
				.layer(1)
				.mount(ige.game.scene.sceneBase);

			ige.game.scene.frontScene = new IgeScene2d()
				.id("frontScene")
				.layer(2)
				.mount(ige.game.scene.sceneBase);

			// Read the galaxy data for this system
			systemData = systems[ige.game._systemId];

			// Create stations
			if (systemData.station) {
				for (i = 0; i < systemData.station.length; i++) {
					station = systemData.station[i];

					new SpaceStation(station.public)
						.id(station._id)
						.translateTo(station.position[0], station.position[1], station.position[2])
						.streamMode(1)
						.mount(ige.game.scene.middleScene);
				}
			}

			// Create jump gates
			if (systemData.jumpGate) {
				for (i = 0; i < systemData.jumpGate.length; i++) {
					jumpGate = systemData.jumpGate[i];

					new JumpGate(jumpGate.public)
						.id(jumpGate._id)
						.translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
						.streamMode(1)
						.mount(ige.game.scene.middleScene);
				}
			}

			// Create jump gates
			if (systemData.asteroidBelt) {
				for (i = 0; i < systemData.asteroidBelt.length; i++) {
					asteroidBelt = systemData.asteroidBelt[i];
					generateAsteroidBelt(asteroidBelt.position[0], asteroidBelt.position[1]);
				}
			}
		}
	}

	removeGraph () {
		const sceneBase = ige.$("sceneBase");
		if (!sceneBase) return;

		sceneBase.destroy();
	}
}
