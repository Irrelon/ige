"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiningLaserEffect = void 0;
const instance_1 = require("../../../../../engine/instance.js");
const clientServer_1 = require("../../../../../engine/clientServer.js");
const IgePoint3d_1 = require("../../../../../engine/core/IgePoint3d.js");
const LaserEffect_1 = require("./LaserEffect");
const MiningParticle_1 = require("../particles/MiningParticle");
const IgeParticleEmitter_1 = require("../../../../../engine/core/IgeParticleEmitter.js");
const index_1 = require("../../../../../engine/audio/index.js");
const igeClassStore_1 = require("../../../../../engine/igeClassStore.js");
class MiningLaserEffect extends LaserEffect_1.LaserEffect {
    constructor(data = {}) {
        super(data);
        this.classId = "MiningLaserEffect";
        if (clientServer_1.isClient) {
            this.audio = new index_1.IgeAudioEntity("miningLaser")
                .relativeTo(instance_1.ige.app.playerEntity)
                .mount(this);
            this.texture(instance_1.ige.textures.get("laser1"));
            this.particleEmitter = new IgeParticleEmitter_1.IgeParticleEmitter()
                // Set the particle entity to generate for each particle
                .particle(MiningParticle_1.MiningParticle)
                // Set particle life to 300ms
                .lifeBase(600)
                // Set output to 60 particles a second (1000ms)
                .quantityBase(60)
                .quantityTimespan(1000)
                .scaleBaseX(1)
                .scaleBaseY(1)
                // Set the particle's death opacity to zero so it fades out as it's lifespan runs out
                .deathOpacityBase(0)
                // Set velocity vector to y = 0.02, with variance values
                .velocityVector(new IgePoint3d_1.IgePoint3d(0, 0, 0), new IgePoint3d_1.IgePoint3d(-0.05, -0.05, 0), new IgePoint3d_1.IgePoint3d(0.05, 0.05, 0))
                // Mount new particles to the object scene
                .particleMountTarget(instance_1.ige.$("frontScene"))
                .layer(4)
                // Mount the emitter to the ship
                .mount(this);
        }
        this.layer(3);
    }
    update(ctx, tickDelta) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        super.update(ctx, tickDelta);
        if (clientServer_1.isClient) {
            if (this._fromEntity && this._toEntity && this._alive) {
                (_a = this.particleEmitter) === null || _a === void 0 ? void 0 : _a.translateTo(this._toEntity._translate.x + this._scanX, this._toEntity._translate.y + this._scanY, 0);
                (_b = this.audio) === null || _b === void 0 ? void 0 : _b.translateTo(this._toEntity._translate.x + this._scanX, this._toEntity._translate.y + this._scanY, 0);
                if (!((_c = this.particleEmitter) === null || _c === void 0 ? void 0 : _c._started)) {
                    (_d = this.particleEmitter) === null || _d === void 0 ? void 0 : _d.start();
                }
                if (!((_e = this.audio) === null || _e === void 0 ? void 0 : _e.playing())) {
                    (_f = this.audio) === null || _f === void 0 ? void 0 : _f.play(true);
                }
            }
            else {
                if ((_g = this.particleEmitter) === null || _g === void 0 ? void 0 : _g._started) {
                    (_h = this.particleEmitter) === null || _h === void 0 ? void 0 : _h.stop();
                }
                if ((_j = this.audio) === null || _j === void 0 ? void 0 : _j.playing()) {
                    (_k = this.audio) === null || _k === void 0 ? void 0 : _k.stop();
                }
            }
        }
    }
    destroy() {
        var _a;
        if (clientServer_1.isClient) {
            (_a = this.audio) === null || _a === void 0 ? void 0 : _a.stop();
        }
        return super.destroy();
    }
}
exports.MiningLaserEffect = MiningLaserEffect;
(0, igeClassStore_1.registerClass)(MiningLaserEffect);
