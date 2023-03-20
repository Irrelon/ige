"use strict";
var appCore = require('../../../../ige');
appCore.module('MiningParticle', function ($ige, $textures, IgeEntityBox2d, IgeVelocityComponent) {
    var MiningParticle = IgeEntityBox2d.extend({
        classId: 'MiningParticle',
        init: function (emitter) {
            var self = this;
            self._emitter = emitter;
            IgeEntityBox2d.prototype.init.call(this);
            // Setup the particle default values
            self.addComponent(IgeVelocityComponent)
                .texture($textures.get('explosions1'))
                .cell(39)
                .width(15)
                .height(15)
                .layer(1)
                .category('MiningParticle');
            /*self.addComponent(IgeAnimationComponent);
             self.animation
             .define('smoke', self.animation.generateFrameArray(32, 71), 25, -1)
             .cell(1);*/
            //self.animation.start('smoke');
        },
        destroy: function () {
            // Remove ourselves from the emitter
            if (this._emitter !== undefined) {
                this._emitter._particles.pull(this);
            }
            IgeEntityBox2d.prototype.destroy.call(this);
            //this.animation.stop();
        }
    });
    return MiningParticle;
});
