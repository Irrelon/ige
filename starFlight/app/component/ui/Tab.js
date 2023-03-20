"use strict";
var appCore = require('../../../../ige');
appCore.module('Tab', function ($ige, $textures, $game, $time, IgeUiEntity, IgeUiLabel) {
    var Tab = IgeUiEntity.extend({
        classId: 'Tab',
        init: function (options) {
            var self = this;
            IgeUiEntity.prototype.init.call(this);
            this._tab = options;
            this.width(options.width);
            this.height(20);
            // Set position of this tab from parent
            switch (options.position) {
                case 'top':
                    this.top(-this.height());
                    this.left(10);
                    break;
                case 'bottom':
                    this.bottom(-this.height());
                    this.left(10);
                    break;
                case 'left':
                    break;
                case 'right':
                    break;
                default:
                    throw ('Unsupported tab position: ' + options.position);
            }
            this._label = new IgeUiLabel()
                .layer(1)
                .font(options.labelFont || '8px Verdana')
                .height(12)
                .width(80)
                .left(5)
                .top(4)
                .textAlignX(0)
                .textAlignY(1)
                .textLineSpacing(12)
                .color('#7bdaf1')
                .value(options.label)
                .mount(this);
            this.texture($textures.get('tab'));
            // Setup click handler to slide the parent in and out
            this._mouseUp = function () {
                var currentPos, currentVal, targetVal;
                switch (options.position) {
                    case 'top':
                        currentPos = self.parent().bottom();
                        if (currentPos > 0) {
                            // Slide down
                            targetVal = -self.parent().height();
                        }
                        else {
                            // Slide up
                            targetVal = options.tweenDefault;
                        }
                        self._slideVal = currentPos;
                        self.tween({
                            _slideVal: targetVal
                        }, 200).afterChange(function () {
                            self.parent().bottom(self._slideVal);
                        }).start();
                        break;
                    case 'bottom':
                        currentPos = self.parent().top();
                        if (currentPos > 0) {
                            // Slide up
                            targetVal = -self.parent().height();
                        }
                        else {
                            // Slide down
                            targetVal = options.tweenDefault;
                        }
                        self._slideVal = currentPos;
                        self.tween({
                            _slideVal: targetVal
                        }, 200).afterChange(function () {
                            self.parent().top(self._slideVal);
                        }).start();
                        break;
                    case 'left':
                        break;
                    case 'right':
                        break;
                    default:
                        throw ('Unsupported tab position: ' + options.position);
                }
            };
        }
    });
    return Tab;
});
