"use strict";
var appCore = require('../../../ige'), oreTypes = require('../data/oreTypes.json');
require('./GameEntity');
require('./Ore');
appCore.module('Asteroid', function ($ige, $textures, $game, GameEntity, IgePoly2d, Ore) {
    var Asteroid = GameEntity.extend({
        classId: 'Asteroid',
        init: function (publicGameData) {
            var self = this, amount, i, triangles, fixDefs = [], collisionPoly;
            publicGameData = publicGameData || {};
            GameEntity.prototype.init.call(this, publicGameData);
            self.category('asteroid');
            publicGameData.size = publicGameData.size || Math.floor((Math.random() * 40) + 20);
            publicGameData.type = publicGameData.type || Math.round(Math.random() * 7) + 1;
            publicGameData.rotation = Math.round(Math.random() * 360);
            self._publicGameData = publicGameData;
            self._ore = {};
            /* CEXCLUDE */
            if ($ige.isServer) {
                // Set the types and quantities of ore in this asteroid
                self._oreCount = 0;
                self._oreTypeCount = Math.round(Math.random() * 3) + 1;
                for (i = 0; i < self._oreTypeCount; i++) {
                    amount = Math.round(Math.random() * 1000) + 100;
                    self._ore[oreTypes[Math.round(Math.random() * (oreTypes.length - 1))]] = amount;
                    self._oreCount += amount;
                }
            }
            /* CEXCLUDE */
            self.layer(1)
                .width(publicGameData.size)
                .height(publicGameData.size);
            if ($ige.engine.box2d) {
                // Define the polygon for collision
                collisionPoly = new IgePoly2d()
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
                collisionPoly.divide($ige.engine.box2d._scaleRatio);
                // Now convert this polygon into an array of triangles
                triangles = collisionPoly.triangulate();
                this.triangles = triangles;
                // Create an array of box2d fixture definitions
                // based on the triangles
                for (i = 0; i < this.triangles.length; i++) {
                    fixDefs.push({
                        density: 0.5,
                        friction: 0.8,
                        restitution: 0.8,
                        filter: {
                            categoryBits: 0x0002,
                            maskBits: 0xffff & ~0x0008
                        },
                        shape: {
                            type: 'circle'
                        }
                        /*shape: {
                            type: 'polygon',
                            data: this.triangles[i]
                        }*/
                    });
                }
                // Create box2d body for this object
                self.box2dBody({
                    type: 'dynamic',
                    linearDamping: 0.7,
                    angularDamping: 0.2,
                    allowSleep: true,
                    bullet: false,
                    gravitic: true,
                    fixedRotation: false,
                    fixtures: fixDefs
                });
            }
            self.rotateTo(0, 0, Math.radians(publicGameData.rotation));
            if (!$ige.isServer) {
                self.texture($textures.get('asteroid' + publicGameData.type));
            }
        },
        streamCreateData: function () {
            return this._publicGameData;
        },
        ore: function () {
            return this._ore;
        },
        handleAcceptedAction: function (actionId, tickDelta) {
        },
        removeRandomOreType: function () {
            var oreType;
            // TODO check that the ore we picked has any in "stock" on this asteroid
            oreType = oreTypes[Math.round(Math.random() * (Object.keys(this._ore).length - 1))];
            // Reduce the ore in the asteroid
            this._ore[oreType]--;
            this._oreCount--;
            return oreType;
        },
        /* CEXCLUDE */
        applyDamage: function (val) {
            var previousWholeHealth = Math.floor(this._health), newWholeHealth;
            // Call parent class function
            GameEntity.prototype.applyDamage.call(this, val);
            // Get new health whole number
            newWholeHealth = Math.floor(this._health);
            // Check if we should spawn any new ore instances
            if (previousWholeHealth - newWholeHealth > 0) {
                // Spawn ore to cover the amount of damage... one ore per damage unit
                this.spawnMinedOre(previousWholeHealth - newWholeHealth);
            }
        },
        /* CEXCLUDE */
        /* CEXCLUDE */
        spawnMinedOre: function (oreType) {
            var ore;
            ore = new Ore({
                type: oreType
            });
            ore.mount($game.scene.frontScene);
            ore.translateTo(this._translate.x, this._translate.y, 0);
            ore.updateTransform();
            ore.streamMode(1);
        },
        /* CEXCLUDE */
        _mouseUp: function () {
            $ige.engine.audio.play('select');
            $game.playerEntity.selectTarget(this);
            // Cancel further event propagation
            return true;
        }
    });
    return Asteroid;
});
