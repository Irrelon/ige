"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCollisionMap2d = void 0;
const IgeEntity_1 = require("./IgeEntity");
const IgeMap2d_1 = require("./IgeMap2d");
// TODO: Does this NEED to be an IgeEntity or can it be an IgeObject?
class IgeCollisionMap2d extends IgeEntity_1.IgeEntity {
	constructor() {
		super();
		this.classId = "IgeCollisionMap2d";
		this.map = new IgeMap2d_1.IgeMap2d();
	}
	mapData(val) {
		if (val !== undefined) {
			this.map.mapData(val);
			return this;
		}
		return this.map.mapData();
	}
}
exports.IgeCollisionMap2d = IgeCollisionMap2d;
