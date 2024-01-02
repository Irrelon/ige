"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ship = void 0;
const GameEntity_1 = require("./GameEntity");
const ThrustParticle_1 = require("./particles/ThrustParticle");
const clientServer_1 = require("../../../../engine/clientServer.js");
const IgeParticleEmitter_1 = require("../../../../engine/core/IgeParticleEmitter.js");
const IgePoint3d_1 = require("../../../../engine/core/IgePoint3d.js");
const IgePoly2d_1 = require("../../../../engine/core/IgePoly2d.js");
const instance_1 = require("../../../../engine/instance.js");
const IgeBox2dBodyType_1 = require("../../../../enums/IgeBox2dBodyType.js");
const IgeBox2dFixtureShapeType_1 = require("../../../../enums/IgeBox2dFixtureShapeType.js");
class Ship extends GameEntity_1.GameEntity {
    constructor(publicGameData) {
        super(publicGameData);
        this.classId = "Ship";
        this.streamProperty("thrusting", false);
        this.category("ship");
        this.layer(2).width(40).height(40);
        if (clientServer_1.isServer) {
            // Define the polygon for collision
            this._definePhysics();
        }
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("ship1"));
            this.thrustEmitter = new IgeParticleEmitter_1.IgeParticleEmitter()
                // Set the particle entity to generate for each particle
                .particle(ThrustParticle_1.ThrustParticle)
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
                .velocityVector(new IgePoint3d_1.IgePoint3d(0, 0.01, 0), new IgePoint3d_1.IgePoint3d(-0.08, 0.01, 0), new IgePoint3d_1.IgePoint3d(0.08, 0.05, 0))
                // Mount new particles to the object scene
                .particleMountTarget(instance_1.ige.$("frontScene"))
                // Move the particle emitter to the bottom of the ship
                .translateTo(0, 16, 0)
                // Mount the emitter to the ship
                .mount(this);
        }
        this._setup();
    }
    _definePhysics() {
        const collisionPoly = new IgePoly2d_1.IgePoly2d()
            .addPoint(0, -this._bounds2d.y2)
            .addPoint(this._bounds2d.x2, this._bounds2d.y2 - 7)
            .addPoint(0, this._bounds2d.y2 - 2)
            .addPoint(-this._bounds2d.x2, this._bounds2d.y2 - 7);
        // Scale the polygon by the box2d scale ratio
        collisionPoly.divide(instance_1.ige.box2d._scaleRatio);
        // Now convert this polygon into an array of triangles
        this.triangles = collisionPoly.triangulate();
        // Create an array of box2d fixture definitions
        // based on the triangles
        const fixDefs = [];
        for (let i = 0; i < this.triangles.length; i++) {
            fixDefs.push({
                density: 0.2,
                friction: 1.0,
                restitution: 0.2,
                filter: {
                    categoryBits: 0x0001,
                    maskBits: 0xffff & ~0x0008
                },
                shape: {
                    type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.polygon,
                    data: this.triangles[i]
                }
            });
        }
        // Create box2d body for this object
        this.box2dBody({
            type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
            linearDamping: this._publicGameData.state.linearDamping.min,
            angularDamping: 0.5,
            allowSleep: true,
            bullet: false,
            gravitic: true,
            fixedRotation: false,
            fixtures: fixDefs
        });
    }
    /**
     * Called every frame by the engine when this entity is mounted to the
     * scenegraph.
     * @param ctx The canvas context to render to.
     * @param tickDelta
     */
    update(ctx, tickDelta) {
        var _a, _b;
        if (!clientServer_1.isServer) {
            if (this.streamProperty("thrusting")) {
                (_a = this.thrustEmitter) === null || _a === void 0 ? void 0 : _a.start();
            }
            else {
                (_b = this.thrustEmitter) === null || _b === void 0 ? void 0 : _b.stop();
            }
        }
        super.update(ctx, tickDelta);
    }
}
exports.Ship = Ship;
