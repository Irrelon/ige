import { IgeEventingClass } from "./IgeEventingClass.js"
import { ige } from "../instance.js"
import { arrPull } from "../utils/arrays.js"
import { IgeBehaviourType } from "../../enums/index.js"
export class IgeTimeController extends IgeEventingClass {
    static componentTargetClass = "Ige";
    classId = "IgeTimeController";
    componentId = "time";
    _updating = false;
    _timers = [];
    _additions = [];
    _removals = [];
    isReady() {
        return new Promise((resolve) => {
            setTimeout(() => {
                ige.dependencies.waitFor(["engine"], () => {
                    // Add the time behaviour to the entity
                    ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "time", this._update);
                    resolve();
                });
            }, 1);
        });
    }
    addTimer = (timer) => {
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
    removeTimer = (timer) => {
        if (timer) {
            if (!this._updating) {
                arrPull(this._timers, timer);
            }
            else {
                this._removals.push(timer);
            }
        }
        return this;
    };
    _update = () => {
        // Get the ige tick delta and tell our timers / intervals that an update has occurred
        const delta = ige.engine._tickDelta;
        const arr = this._timers;
        let arrCount = arr.length;
        while (arrCount--) {
            arr[arrCount].addTime(delta).update();
        }
        // Process removing any timers that were scheduled for removal
        this._processRemovals();
        // Now process any additions to the timers that were scheduled to be added
        this._processAdditions();
        return this;
    };
    _processAdditions = () => {
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
    _processRemovals = () => {
        const arr = this._removals;
        let arrCount = arr.length;
        if (arrCount) {
            while (arrCount--) {
                arrPull(this._timers, arr[arrCount]);
            }
            this._removals = [];
        }
        return this;
    };
}
