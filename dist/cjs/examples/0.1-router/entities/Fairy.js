"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fairy = void 0;
const instance_1 = require("../../../engine/instance.js");
const Rotator_1 = require("./Rotator");
const ChildRotators_1 = require("./ChildRotators");
const clientServer_1 = require("../../../engine/clientServer.js");
class Fairy extends Rotator_1.Rotator {
	constructor(speed) {
		super(speed);
		this.depth(1).width(100).height(100).translateTo(0, 0, 0);
		if (clientServer_1.isClient) {
			this.texture(instance_1.ige.textures.get("fairy"));
		}
		const arr = (0, ChildRotators_1.createChildRotators)(this, 200, 0.05);
		const arrBox1 = (0, ChildRotators_1.createChildRotators)(arr[0], 120, -0.2);
		const arrBox2 = (0, ChildRotators_1.createChildRotators)(arr[1], 120, -0.2);
		const arrBox3 = (0, ChildRotators_1.createChildRotators)(arr[2], 120, -0.2);
		const arrBox4 = (0, ChildRotators_1.createChildRotators)(arr[3], 120, -0.2);
		(0, ChildRotators_1.createChildRotators)(arrBox1[0], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox1[1], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox1[2], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox1[3], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox2[0], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox2[1], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox2[2], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox2[3], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox3[0], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox3[1], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox3[2], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox3[3], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox4[0], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox4[1], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox4[2], 80, -0.4);
		(0, ChildRotators_1.createChildRotators)(arrBox4[3], 80, -0.4);
	}
}
exports.Fairy = Fairy;
