export class IgeDependencies {
	constructor() {
		this._dependencyFulfilled = {};
		this._dependsOnArr = [];
	}
	add(dependencyName, dependencyPromise) {
		dependencyPromise
			.then(() => {
				this._onDependencySatisfied(dependencyName);
			})
			.catch((err) => {
				throw new Error(`Dependency ${dependencyName} threw an error: ${err}`);
			});
	}
	waitFor(dependencyList, actionToTake) {
		if (this._isDependencyListSatisfied(dependencyList)) {
			// All deps for this action are already fulfilled so call immediately
			actionToTake();
			return;
		}
		// Not all deps are fulfilled, add to the action array
		this._dependsOnArr.push({ dependencyList, actionToTake });
	}
	markAsSatisfied(dependencyName) {
		this._onDependencySatisfied(dependencyName);
	}
	_onDependencySatisfied(dependencyName) {
		// Mark the dependency as satisfied
		this._dependencyFulfilled[dependencyName] = true;
		// Loop the pending action array and check if this
		// has caused fully satisfied conditions for any actions. If they
		// have been satisfied, the handler is informed and the item is
		// removed from the array
		this._dependsOnArr = this._dependsOnArr.filter((dependencyAction) => {
			if (this._isDependencyListSatisfied(dependencyAction.dependencyList)) {
				// Execute the action and return false so the filter removes the item
				dependencyAction.actionToTake();
				return false;
			}
			// Return true so the filter() keeps this actions
			return true;
		});
	}
	_isDependencyListSatisfied(dependencyList) {
		return dependencyList.every((dependencyName) => this._dependencyFulfilled[dependencyName]);
	}
}
