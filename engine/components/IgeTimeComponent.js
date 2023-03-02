import IgeEventingClass from "../src/IgeEventingClass";
import IgeBaseClass from "../src/IgeBaseClass";

class IgeTimeComponent extends IgeEventingClass {
	classId = "IgeTimeComponent";
	componentId = "time";

	/**
	 * @constructor
	 * @param {Ige} ige The engine instance.
	 * @param {Object} entity The parent object that this component is being added to.
	 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
	 */
	constructor (ige, entity, options) {
		super(ige);

		this._entity = entity;
		this._timers = [];
		this._additions = [];
		this._removals = [];

		// Add the animation behaviour to the entity
		entity.addBehaviour("time", this._update.bind(this));
	}

	addTimer = (timer) => {
		if (timer) {
			if (!this._updating) {
				this._timers.push(timer);
			} else {
				this._additions.push(timer);
			}
		}

		return this;
	}

	removeTimer = (timer) => {
		if (timer) {
			if (!this._updating) {
				IgeBaseClass.pull(this._timers, timer);
			} else {
				this._removals.push(timer);
			}
		}

		return this;
	}

	_update () {
		// Get the ige tick delta and tell our timers / intervals that an update has occurred
		var delta = this._ige._tickDelta,
			arr = this._timers,
			arrCount = arr.length;

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
		var arr = this._additions,
			arrCount = arr.length;

		if (arrCount) {
			while (arrCount--) {
				this._timers.push(arr[arrCount]);
			}

			this._additions = [];
		}

		return this;
	}

	_processRemovals = () => {
		var arr = this._removals,
			arrCount = arr.length;

		if (arrCount) {
			while (arrCount--) {
				IgeBaseClass.pull(this._timers, arr[arrCount]);
			}

			this._removals = [];
		}

		return this;
	}
}

export default IgeTimeComponent;