"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rotator = void 0;
const IgeEntity_1 = require("../../../engine/core/IgeEntity.js");
const instance_1 = require("../../../engine/instance.js");
class Rotator extends IgeEntity_1.IgeEntity {
    constructor(speed) {
        super();
        this.classId = "Rotator";
        this._rSpeed = 0;
        if (speed !== undefined) {
            this._rSpeed = speed;
        }
        else {
            this._rSpeed = 0;
        }
    }
    /**
     * Called every frame by the engine when this entity is mounted to the scenegraph.
     * @param ctx The canvas context to render to.
     */
    tick(ctx) {
        // Rotate this entity by 0.1 degrees.
        this.rotateBy(0, 0, (this._rSpeed * instance_1.ige.engine._tickDelta * Math.PI) / 180);
        // Call the IgeEntity (super-class) tick() method
        super.tick(ctx);
    }
}
exports.Rotator = Rotator;
