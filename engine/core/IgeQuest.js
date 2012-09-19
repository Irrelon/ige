var IgeQuest = IgeEventingClass.extend({
	init: function (questDefinition, completeCallback) {
		this._linear = false;
		this._items = [];

		this._itemCompleteCount = 0;
		this._eventCompleteCount = 0;

		this._started = false;
		this._complete = false;

		if (questDefinition !== undefined) {
			this.items(questDefinition);
		}

		if (completeCallback !== undefined) {
			this._completeCallback = completeCallback;
		}
	},

	complete: function (callback) {
		if (callback !== undefined) {
			this._completeCallback = callback;
			return this;
		}

		return this._completeCallback;
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
			return this;
		}

		return this._items;
	},

	/**
	 * Returns the number of quest items this quest has.
	 * @return {Number}
	 */
	itemCount: function () {
		return this._items.length;
	},

	/**
	 * Returns the sum of all event counts for every item
	 * in the quest giving an overall number of events that
	 * need to fire in order for the quest to be completed.
	 * @return {Number}
	 */
	eventCount: function () {
		var arr = this._items,
			arrCount = arr.length,
			i,
			eventCount = 0;

		for (i = 0; i < arrCount; i++) {
			eventCount += arr[i].count;
		}

		return eventCount;
	},

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
	},

	_setupItemListener: function (item) {
		var self = this;

		// Set the item's internal event count to zero
		// (number of times the event has fired)
		item._eventCount = 0;
		item._complete = false;

		// Create the event listener
		item._listener = item.emitter.on(item.eventName, function () {
			self._eventComplete(item);
		});
	},

	reset: function () {
		var arr = this._items,
			arrCount = arr.length,
			i;

		for (i = 0; i < arrCount; i++) {
			// Reset all the item internals
			arr[i]._complete = false;
			arr[i]._eventCount = 0;
		}

		// Reset quest internals
		this._eventCompleteCount = 0;
		this._itemCompleteCount = 0;
		this._complete = false;
	},

	_eventComplete: function (item) {
		// Increment the internal event count
		item._eventCount++;

		// Increment the quest's internal event count
		this._eventCompleteCount++;

		// Fire the callback to the game logic
		item.eventCallback.apply(this, item);

		// Emit the event complete event
		this.emit('eventComplete', item);

		// Check if we've reached our designated event count
		if (item._eventCount === item.count) {
			this._itemComplete(item);
		}
	},

	_itemComplete: function (item) {
		var itemIndex;

		// Mark the item as complete
		item._complete = true;

		// Cancel the listener
		item.emitter.off(item.eventName, item._listener);

		// Increment the quest's item complete count
		this._itemCompleteCount++;

		// Fire the item's itemCallback to the game logic
		item.itemCallback.apply(this, item);

		// Emit the item complete event
		this.emit('itemComplete', item);

		// Tell the quest to check it's internals
		this._update();

		// Check if the quest is linear
		if (this._linear && this._itemCompleteCount < this.itemCount()) {
			// Advance the listener to the next item
			itemIndex = arr.indexOf(item);
			this._setupItemListener(arr[itemIndex + 1]);

			// Emit the nextItem event (linear quests only)
			this.emit('nextItem', arr[itemIndex + 1]);
		}
	},

	_update: function () {
		// Check if all our items are complete
		if (this._itemCompleteCount === this.itemCount()) {
			// Mark the quest as complete
			this._complete = true;

			// Fire the quest completed callback
			this._completeCallback.apply(this);

			// Stop the quest
			this.stop();

			// Emit the quest complete event
			this.emit('complete');
		}
	},

	stop: function () {
		if (this._started) {
			this._started = false;
			this.emit('stopped');
		} else {
			this.log('Cannot stop quest because it has not been started yet!', 'warning');
			this.emit('notStarted');
		}
	}
});