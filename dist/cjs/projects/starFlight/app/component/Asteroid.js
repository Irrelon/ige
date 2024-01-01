"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Asteroid = void 0;
const instance_1 = require("../../../../engine/instance.js");
const clientServer_1 = require("../../../../engine/clientServer.js");
const oreTypes_1 = require("../data/oreTypes");
const IgePoly2d_1 = require("../../../../engine/core/IgePoly2d.js");
const Ore_1 = require("./Ore");
const utils_1 = require("../../../../engine/utils.js");
const GameEntity_1 = require("./GameEntity");
const IgeBox2dBodyType_1 = require("../../../../enums/IgeBox2dBodyType.js");
const IgeBox2dFixtureShapeType_1 = require("../../../../enums/IgeBox2dFixtureShapeType.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
class Asteroid extends GameEntity_1.GameEntity {
    constructor(publicGameData) {
        super(publicGameData);
        this.classId = "Asteroid";
        this._oreCount = 0;
        this._ore = {};
        this._oreTypeCount = 0;
        this._triangles = [];
        this.category("asteroid");
        publicGameData = publicGameData || {};
        publicGameData.size = publicGameData.size || Math.floor((Math.random() * 40) + 20);
        publicGameData.type = publicGameData.type || Math.round(Math.random() * 7) + 1;
        publicGameData.rotation = Math.round(Math.random() * 360);
        this._publicGameData = publicGameData;
        this._ore = {};
        this._setup();
        if (clientServer_1.isServer) {
            // Set the types and quantities of ore in this asteroid
            this._oreCount = 0;
            this._oreTypeCount = Math.round(Math.random() * 3) + 1;
            for (let i = 0; i < this._oreTypeCount; i++) {
                const amount = Math.round(Math.random() * 1000) + 100;
                const tmpOreType = oreTypes_1.oreTypes[Math.round(Math.random() * (oreTypes_1.oreTypes.length - 1))];
                this._ore[tmpOreType] = amount;
                this._oreCount += amount;
            }
        }
        this.layer(1)
            .width(publicGameData.size)
            .height(publicGameData.size);
        if (clientServer_1.isServer) {
            const fixDefs = [];
            // Define the polygon for collision
            const collisionPoly = new IgePoly2d_1.IgePoly2d()
                .addPoint(0, -this._bounds2d.y2 * 0.7)
                .addPoint(this._bounds2d.x2 * 0.5, -this._bounds2d.y2 * 0.4)
                .addPoint(this._bounds2d.x2 * 0.6, 0)
                .addPoint(this._bounds2d.x2 * 0.2, this._bounds2d.y2 * 0.5)
                .addPoint(-this._bounds2d.x2 * 0.2, this._bounds2d.y2 * 0.4)
                .addPoint(-this._bounds2d.x2 * 0.5, this._bounds2d.y2 * 0.3)
                .addPoint(-this._bounds2d.x2 * 0.75, this._bounds2d.y2 * 0.25)
                .addPoint(-this._bounds2d.x2 * 0.85, this._bounds2d.y2 * 0.10)
                .addPoint(-this._bounds2d.x2 * 0.65, -this._bounds2d.y2 * 0.15)
                .addPoint(-this._bounds2d.x2 * 0.65, -this._bounds2d.y2 * 0.35)
                .addPoint(-this._bounds2d.x2 * 0.25, -this._bounds2d.y2 * 0.75);
            // Scale the polygon by the box2d scale ratio
            collisionPoly.divide(instance_1.ige.box2d._scaleRatio);
            // Now convert this polygon into an array of triangles
            this._triangles = collisionPoly.triangulate();
            // Create an array of box2d fixture definitions
            // based on the triangles
            for (let i = 0; i < this._triangles.length; i++) {
                fixDefs.push({
                    density: 0.5,
                    friction: 0.8,
                    restitution: 0.8,
                    filter: {
                        categoryBits: 0x0002,
                        maskBits: 0xffff & ~0x0008
                    },
                    shape: {
                        type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.circle
                    }
                    /*shape: {
                        type: IgeBox2dFixtureShapeType.polygon,
                        data: this.triangles[i]
                    }*/
                });
            }
            // Create box2d body for this object
            this.box2dBody({
                type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
                linearDamping: 0.7,
                angularDamping: 0.2,
                allowSleep: true,
                bullet: false,
                gravitic: true,
                fixedRotation: false,
                fixtures: fixDefs
            });
        }
        this.rotateTo(0, 0, (0, utils_1.degreesToRadians)(publicGameData.rotation));
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("asteroid" + publicGameData.type));
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
    ore() {
        return this._ore;
    }
    handleAcceptedAction(actionId, tickDelta) {
    }
    removeRandomOreType() {
        // TODO check that the ore we picked has any in "stock" on this asteroid
        const oreType = Math.round(Math.random() * (Object.keys(this._ore).length - 1));
        // Reduce the ore in the asteroid
        this._ore[oreType]--;
        this._oreCount--;
        return oreType;
    }
    applyDamage(val) {
        const previousWholeHealth = Math.floor(this._health);
        // Call parent class function
        super.applyDamage(val);
        // Get new health whole number
        const newWholeHealth = Math.floor(this._health);
        // Check if we should spawn any new ore instances
        if (previousWholeHealth - newWholeHealth > 0) {
            // Spawn ore to cover the amount of damage... one ore per damage unit
            this.spawnMinedOre(previousWholeHealth - newWholeHealth);
        }
        return this;
    }
    spawnMinedOre(oreType) {
        if (clientServer_1.isServer) {
            const ore = new Ore_1.Ore({
                type: oreType
            });
            ore.mount(instance_1.ige.$("frontScene"));
            ore.translateTo(this._translate.x, this._translate.y, 0);
            ore.updateTransform();
            ore.streamMode(1);
        }
    }
    _pointerUp() {
        instance_1.ige.audio.play("select");
        instance_1.ige.app.playerEntity.selectTarget(this);
        // Cancel further event propagation
        return true;
    }
}
exports.Asteroid = Asteroid;
(0, igeClassStore_1.registerClass)(Asteroid);
