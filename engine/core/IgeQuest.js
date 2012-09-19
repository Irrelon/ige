var IgeQuest = IgeEventingClass.extend({
	classId: 'IgeQuest',

	init: function (questDefinition, completeCallback) {
		this._linear = false;
		this._items = [];

		this._itemCount = 0;
		this._eventCount = 0;
		this._itemCompleteCount = 0;
		this._eventCompleteCount = 0;

		this._started = false;
		this._isComplete = false;

		if (questDefinition !== undefined) {
			this.items(questDefinition);
		}

		if (completeCallback !== undefined) {
			this._completeCallback = completeCallback;
		}
	},

	/**
	 * Gets / sets the callback method that will fire when
	 * the quest has been completed.
	 * @param callback
	 * @return {*}
	 */
	complete: function (callback) {
		if (callback !== undefined) {
			this._completeCallback = callback;
			return this;
		}

		return this._completeCallback;
	},

	/**
	 * Gets / sets the flag that determines if the quest
	 * has been completed successfully or not.
	 * @param val
	 * @return {*}
	 */
	isComplete: function (val) {
		if (val !== undefined) {
			this._isComplete = val;
			return this;
		}

		return this._isComplete;
	},

	/**
	 * Gets / sets the flag that determines if the quest items
	 * need to be completed in order (true) or if they can be
	 * completed in any order (false). Default is false.
	 * @param val
	 * @return {*}
	 */
	linear: function (val) {
		if (val !== undefined) {
			this._linear = val;
			return this;
		}

		return this._linear;
	},

	/**
	 * Gets / sets the items array containing the quest item
	 * definition objects.
	 * @param val
	 * @return {*}
	 */
	items: function (val) {
		if (val !== undefined) {
			this._items = val;

			// Set the event and item counts
			var arr = this._items,
				arrCount = arr.length,
				i,
				eventCount = 0;

			for (i = 0; i < arrCount; i++) {
				eventCount += arr[i].count;
			}

			this._eventCount = eventCount;
			this._itemCount = arrCount;

			return this;
		}

		return this._items;
	},

	/**
	 * Returns the number of quest items this quest has.
	 * @return {Number}
	 */
	itemCount: function () {
		return this._itemCount;
	},

	/**
	 * Returns the sum of all event counts for every item
	 * in the quest giving an overall number of events that
	 * need to fire in order for the quest to be completed.
	 * @return {Number}
	 */
	eventCount: function () {
		return this._eventCount;
	},

	/**
	 * Returns the number of events that have been completed.
	 * @return {Number}
	 */
	eventCompleteCount: function () {
		return this._eventCompleteCount;
	},

	/**
	 * Returns the number of items that have been completed.
	 * @return {Number}
	 */
	itemCompleteCount: function () {
		return this._itemCompleteCount;
	},

	/**
	 * Returns the percentage representation of the quest's
	 * overall completion based on number of overall events and
	 * number of events that have been completed.
	 * @return {Number} A number from zero to one-hundred.
	 */
	percentComplete: function () {
		return Math.floor((100 / this._eventCount) * this._eventCompleteCount);
	},

	/**
	 * Starts the quest by setting up the quest event
	 * listeners.
	 */
	start: function () {
		if (!this._started) {
			var self = this,
				arr = this._items,
				arrCount = arr.length,
				i;

			// Mark the quest as started
			this._started = true;

			// Check if we have a linear quest or a non-linear one
			if (!this._linear) {
				// The quest is non-linear so activate all the item listeners now...
				// Loop the quest items array
				for (i = 0; i < arrCount; i++) {
					// Setup the listener for this item
					this._setupItemListener(arr[i]);
				}
			} else {
				// The quest is linear so only activate the first listener for now...
				this._setupItemListener(arr[0]);
			}

			this.emit('started');
		} else {
			// Quest already started!
			this.log('Cannot start quest because it has already been started!', 'warning');
			this.emit('alreadyStarted');
		}

		return this;
	},

	/**
	 * Stops the quest and sets all the event listeners to
	 * ignore events until the quest is restarted.
	 */
	stop: function () {
		if (this._started) {
			this._started = false;
			this.emit('stopped');
		} else {
			this.log('Cannot stop quest because it has not been started yet!', 'warning');
			this.emit('notStarted');
		}

		return this;
	},

	/**
	 * Resets the quest and item internals back to their
	 * original values and cancels all current event listeners.
	 */
	reset: function () {
		var arr = this._items,
			arrCount = arr.length,
			i, item;

		for (i = 0; i < arrCount; i++) {
			item = arr[i];

			// Reset all the item internals
			item._complete = false;
			item._eventCount = 0;

			// Cancel the event listener
			if (item._listener) {
				item.emitter.off(item.eventName, item._listener);
			}

			// Clear the reference holding the item listener
			delete item._listener;
		}

		// Reset quest internals
		this._eventCompleteCount = 0;
		this._itemCompleteCount = 0;
		this._isComplete = false;

		this.emit('reset');

		return this;
	},

	/**
	 * Sets up a quest item's event listener.
	 * @param item
	 * @private
	 */
	_setupItemListener: function (item) {
		var self = this;

		// Check for an existing listener
		if (!item._listener) {
			// Set the item's internal event count to zero
			// (number of times the event has fired)
			item._eventCount = 0;
			item._complete = false;

			// Create the event listener
			item._listener = item.emitter.on(item.eventName, function () {
				// Check if the quest is currently started
				if (self._started) {
					// If the item has an event evaluator method...
					if (item.eventEvaluate) {
						// Check if the event's data evaluated to true
						if (item.eventEvaluate.apply(self, arguments)) {
							// The evaluator returned true so complete the event
							self._eventComplete(item);
						}
					} else {
						self._eventComplete(item);
					}
				}
			});
		}
	},

	/**
	 * Handles when an event has been fired for a quest item.
	 * @param item
	 * @private
	 */
	_eventComplete: function (item) {
		// Increment the internal event count
		item._eventCount++;

		// Increment the quest's internal event count
		this._eventCompleteCount++;

		// Fire the callback to the game logic
		if (item.eventCallback) {
			item.eventCallback.apply(this, item);
		}

		// Emit the event complete event
		this.emit('eventComplete', item);

		// Check if we've reached our designated event count
		if (item._eventCount === item.count) {
			this._itemComplete(item);
		}
	},

	/**
	 * Handles when an item's events have all been fired.
	 * @param item
	 * @private
	 */
	_itemComplete: function (item) {
		var itemIndex,
			arr = this._items;

		// Mark the item as complete
		item._complete = true;

		// Cancel the listener
		item.emitter.off(item.eventName, item._listener);
		delete item._listener;

		// Increment the quest's item complete count
		this._itemCompleteCount++;

		// Fire the item's itemCallback to the game logic
		if (item.itemCallback) {
			item.itemCallback.apply(this, item);
		}

		// Emit the item complete event
		this.emit('itemComplete', item);

		// Tell the quest to check it's internals
		this._update();

		// Check if the quest is linear
		if (this._started && this._linear && this._itemCompleteCount < this.itemCount()) {
			// Advance the listener to the next item
			itemIndex = arr.indexOf(item);
			this._setupItemListener(arr[itemIndex + 1]);

			// Emit the nextItem event (linear quests only)
			this.emit('nextItem', arr[itemIndex + 1]);
		}
	},

	/**
	 * Called when a quest item has been completed to determine
	 * if the quest should continue or if it has also been
	 * completed.
	 * @private
	 */
	_update: function () {
		// Check if all our items are complete
		if (this._itemCompleteCount === this.itemCount()) {
			// Mark the quest as complete
			this._isComplete = true;

			// Fire the quest completed callback
			this._completeCallback.apply(this);

			// Emit the quest complete event
			this.emit('complete');

			// Stop the quest
			this.stop();

			// Reset the quest (kills current event listeners)
			this.reset();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeQuest; }