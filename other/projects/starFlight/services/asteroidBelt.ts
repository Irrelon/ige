import type { IgeScene2d } from "@/engine/core/IgeScene2d";
import { ige } from "@/engine/exports";
import { distance } from "@/engine/utils";
import { Asteroid } from "../app/component/Asteroid";

export const generateAsteroidBelt = function generateAsteroidBelt (beltX: number, beltY: number) {
	const asteroidArr = [];
	const maxDist = 900;
	const minDist = 500;
	const max = 100;

	let count = 0;
	let asteroid;

	const middleScene = ige.$("middleScene") as IgeScene2d;

	while (count < max) {
		if (!asteroid) {
			asteroid = new Asteroid();
			asteroid.mount(middleScene);
		}

		const x = Math.floor(beltX + (Math.random() * maxDist * 2 - maxDist));
		const y = Math.floor(beltY + (Math.random() * maxDist * 2 - maxDist));
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
