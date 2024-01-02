"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaserEffect = void 0;
const clientServer_1 = require("../../../../../engine/clientServer.js");
const IgeEntity_1 = require("../../../../../engine/core/IgeEntity.js");
const igeClassStore_1 = require("../../../../../engine/igeClassStore.js");
const instance_1 = require("../../../../../engine/instance.js");
class LaserEffect extends IgeEntity_1.IgeEntity {
    constructor(data = {}) {
        super();
        this.classId = "LaserEffect";
        if (!clientServer_1.isServer) {
            this.texture(instance_1.ige.textures.get("laser1"));
        }
        this._data = data;
        this._scanX = 0;
        this._scanY = 0;
        this._scanSpeedX = 0.05;
        this._scanSpeedY = 0.02;
        this._scanDirX = true;
        this._scanDirY = false;
        this._scanMaxX = 10;
        this._scanMaxY = 10;
        this.streamProperty("from", "");
        this.streamProperty("to", "");
        // Make sure we stream properties!
        this.streamSectionsPush("props");
        if (!clientServer_1.isServer) {
            this.on("streamPropChange", (propName, value) => {
                let targetEnt;
                if (value) {
                    // Add link
                    targetEnt = instance_1.ige.$(value);
                }
                if (propName === "from") {
                    this._fromEntity = targetEnt;
                }
                if (propName === "to") {
                    this._toEntity = targetEnt;
                }
            });
        }
        this.layer(3);
    }
    update(ctx, tickDelta) {
        if (this._fromEntity && this._toEntity) {
            // Make sure our target entities are alive and if not
            // remove them from our cache to avoid issues
            if (!this._fromEntity.alive()) {
                this._fromEntity = undefined;
            }
            if (!this._toEntity.alive()) {
                this._toEntity = undefined;
            }
            if (this._scanDirX === true) {
                this._scanX += this._scanSpeedX;
                if (this._scanX > this._scanMaxX) {
                    this._scanDirX = !this._scanDirX;
                }
            }
            else {
                this._scanX -= this._scanSpeedX;
                if (this._scanX < -this._scanMaxX) {
                    this._scanDirX = !this._scanDirX;
                }
            }
            if (this._scanDirY === true) {
                this._scanY += this._scanSpeedY;
                if (this._scanY > this._scanMaxY) {
                    this._scanDirY = !this._scanDirY;
                }
            }
            else {
                this._scanY -= this._scanSpeedY;
                if (this._scanY < -this._scanMaxY) {
                    this._scanDirY = !this._scanDirY;
                }
            }
        }
        super.update(ctx, tickDelta);
    }
}
exports.LaserEffect = LaserEffect;
(0, igeClassStore_1.registerClass)(LaserEffect);
