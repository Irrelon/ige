"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAsteroidBelt = void 0;
const instance_1 = require("@/engine/instance");
const Asteroid_1 = require("../app/component/Asteroid");
const utils_1 = require("@/engine/utils");
const generateAsteroidBelt = function generateAsteroidBelt(beltX, beltY) {
    const asteroidArr = [];
    const maxDist = 900;
    const minDist = 500;
    const max = 100;
    let count = 0;
    let asteroid;
    const middleScene = instance_1.ige.$("middleScene");
    while (count < max) {
        if (!asteroid) {
            asteroid = new Asteroid_1.Asteroid();
            asteroid.mount(middleScene);
        }
        const x = Math.floor(beltX + ((Math.random() * maxDist * 2) - maxDist));
        const y = Math.floor(beltY + ((Math.random() * maxDist * 2) - maxDist));
        const dist = (0, utils_1.distance)(x, y, beltX, beltY);
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
exports.generateAsteroidBelt = generateAsteroidBelt;
