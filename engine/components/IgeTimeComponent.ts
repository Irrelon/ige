import { ige } from "../instance";
import { IgeComponent } from "../core/IgeComponent";
import { IgeEntity } from "../core/IgeEntity";
import { IgeInterval } from "../core/IgeInterval";
import { arrPull } from "../services/utils";
import { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour";
import type { IgeEngine } from "../core/IgeEngine";

export class IgeTimeComponent extends IgeComponent<IgeEngine> {
	classId = "IgeTimeComponent";
	componentId = "time";

	_updating: boolean = false;
	_timers: IgeInterval[] = [];
	_additions: IgeInterval[] = [];
	_removals: IgeInterval[] = [];

	constructor (entity: IgeEntity, options?: any) {
		super(entity, options);

		// Add the animation behaviour to the entity
		entity.addBehaviour("time", this._update);
	}

	addTimer = (timer: IgeInterval) => {
		if (timer) {
			if (!this._updating) {
				this._timers.push(timer);
			} else {
				this._additions.push(timer);
			}
		}

		return this;
	};

	removeTimer = (timer: IgeInterval) => {
		if (timer) {
			if (!this._updating) {
				arrPull(this._timers, timer);
			} else {
				this._removals.push(timer);
			}
		}

		return this;
	};

	_update: IgeEntityBehaviourMethod = () => {
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
	}

	_processAdditions = () => {
		const arr = this._additions;
		let	arrCount = arr.length;

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
		let	arrCount = arr.length;

		if (arrCount) {
			while (arrCount--) {
				arrPull(this._timers, arr[arrCount]);
			}

			this._removals = [];
		}

		return this;
	};
}
