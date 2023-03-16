import IgeComponent from "../core/IgeComponent.js";
import { arrPull } from "../services/utils.js";
import { ige } from "../instance.js";
class IgeTimeComponent extends IgeComponent {
    constructor(entity, options) {
        super(entity, options);
        this.classId = "IgeTimeComponent";
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
                    arrPull(this._timers, timer);
                }
                else {
                    this._removals.push(timer);
                }
            }
            return this;
        };
        this._update = () => {
            // Get the ige tick delta and tell our timers / intervals that an update has occurred
            const delta = ige.engine._tickDelta;
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
                    arrPull(this._timers, arr[arrCount]);
                }
                this._removals = [];
            }
            return this;
        };
        // Add the animation behaviour to the entity
        entity.addBehaviour("time", this._update);
    }
}
export default IgeTimeComponent;
