var IgeTimeComponent = IgeEventingClass.extend({
	classId: 'IgeTimeComponent',
	componentId: 'time',
	
	/**
	 * @constructor
	 * @param {Object} entity The parent object that this component is being added to.
	 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._timers = [];
		this._additions = [];
		this._removals = [];

		// Add the animation behaviour to the entity
		entity.addBehaviour('time', this._update);
	},
	
	addTimer: function (timer) {
		if (timer) {
			if (!this._updating) {
				this._timers.push(timer);
			} else {
				this._additions.push(timer);
			}
		}
		
		return this;
	},
	
	removeTimer: function (timer) {
		if (timer) {
			if (!this._updating) {
				this._timers.pull(timer);
			} else {
				this._removals.push(timer);
			}
		}
		
		return this;
	},
	
	_update: function () {
		// Get the ige tick delta and tell our timers / intervals that an update has occurred
		var self = ige.time,
			delta = ige._tickDelta,
			arr = self._timers,
			arrCount = arr.length;
		
		while (arrCount--) {
			arr[arrCount]
				.addTime(delta)
				.update();
		}
		
		// Process removing any timers that were scheduled for removal
		self._processRemovals();
		
		// Now process any additions to the timers that were scheduled to be added
		self._processAdditions();
		
		return self;
	},
	
	_processAdditions: function () {
		var arr = this._additions,
			arrCount = arr.length;
		
		if (arrCount) {
			while (arrCount--) {
				this._timers.push(arr[arrCount]);
			}
			
			this._additions = [];
		}
		
		return this;
	},
	
	_processRemovals: function () {
		var arr = this._removals,
			arrCount = arr.length;
		
		if (arrCount) {
			while (arrCount--) {
				this._timers.pull(arr[arrCount]);
			}
			
			this._removals = [];
		}
		
		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTimeComponent; }