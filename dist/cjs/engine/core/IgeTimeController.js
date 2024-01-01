"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTimeController = void 0;
const instance_1 = require("../instance");
const utils_1 = require("../utils");
const IgeBehaviourType_1 = require("@/enums/IgeBehaviourType");
const IgeEventingClass_1 = require("@/engine/core/IgeEventingClass");
class IgeTimeController extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeTimeController";
        this.componentId = "time";
        this._updating = false;
        this._timers = [];
        this._additions = [];
        this._removals = [];
        this.addTimer = (timer) => {
            if (timer) {
                if (!this._updating) {
                    this._timers.push(timer);
                }
                else {
                    this._additions.push(timer);
                }
            }
            return this;
        };
        this.removeTimer = (timer) => {
            if (timer) {
                if (!this._updating) {
                    (0, utils_1.arrPull)(this._timers, timer);
                }
                else {
                    this._removals.push(timer);
                }
            }
            return this;
        };
        this._update = () => {
            // Get the ige tick delta and tell our timers / intervals that an update has occurred
            const delta = instance_1.ige.engine._tickDelta;
            const arr = this._timers;
            let arrCount = arr.length;
            while (arrCount--) {
                arr[arrCount]
                    .addTime(delta)
                    .update();
            }
            // Process removing any timers that were scheduled for removal
            this._processRemovals();
            // Now process any additions to the timers that were scheduled to be added
            this._processAdditions();
            return this;
        };
        this._processAdditions = () => {
            const arr = this._additions;
            let arrCount = arr.length;
            if (arrCount) {
                while (arrCount--) {
                    this._timers.push(arr[arrCount]);
                }
                this._additions = [];
            }
            return this;
        };
        this._processRemovals = () => {
            const arr = this._removals;
            let arrCount = arr.length;
            if (arrCount) {
                while (arrCount--) {
                    (0, utils_1.arrPull)(this._timers, arr[arrCount]);
                }
                this._removals = [];
            }
            return this;
        };
    }
    isReady() {
        return new Promise((resolve) => {
            setTimeout(() => {
                instance_1.ige.dependencies.waitFor(["engine"], () => {
                    // Add the animation behaviour to the entity
                    instance_1.ige.engine.addBehaviour(IgeBehaviourType_1.IgeBehaviourType.preUpdate, "time", this._update);
                    resolve();
                });
            }, 1);
        });
    }
}
exports.IgeTimeController = IgeTimeController;
IgeTimeController.componentTargetClass = "Ige";
