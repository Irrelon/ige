import { global } from "./_global";
export class IgeBaseClass {
    constructor() {
        this.classId = "IgeBaseClass";
        this._dependencyFulfilled = {};
        this._dependsOnArr = [];
        this._data = {};
    }
    addDependency(dependencyName, dependencyPromise) {
        dependencyPromise.then(() => {
            this._onDependencySatisfied(dependencyName);
        }).catch((err) => {
            this.log(`Dependency ${dependencyName} threw an error: ${err}`, "error");
        });
    }
    dependsOn(dependencyList, actionToTake) {
        if (this._isDependencyListSatisfied(dependencyList)) {
            // All deps for this action are already fulfilled so call immediately
            actionToTake();
            return;
        }
        // Not all deps are fulfilled, add to the action array
        this._dependsOnArr.push({ dependencyList, actionToTake });
    }
    _onDependencySatisfied(dependencyName) {
        // Mark the dependency as satisfied
        this._dependencyFulfilled[dependencyName] = true;
        // Loop the pending action array and check if this
        // has caused fully satisfied conditions for any actions
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
    /**
     * Returns the class id. Primarily used to help identify
     * what class an instance was instantiated with and is also
     * output during the ige.scenegraph() method's console logging
     * to show what class an object belongs to.
     * @example #Get the class id of an object.
     *     var entity = new IgeEntity();
     *
     *     // Will output "IgeEntity"
     *     console.log(entity.classId);
     */
    getClassId() {
        return this.classId;
    }
    /**
     * Provides logging capabilities to all IgeBaseClass instances.
     * @param message
     * @param args
     *
     * @example #Log a message
     *     var entity = new IgeEntity();
     *
     *     // Will output:
     *     //     IGE *log* [IgeEntity] : hello
     *     entity.log('Hello');
     * @example #Log an info message with an optional parameter
     *     var entity = new IgeEntity(),
     *         param = 'moo';
     *
     *     // Will output:
     *     //    moo
     *     //    IGE *log* [IgeEntity] : hello
     *     entity.log('Hello', 'info', param);
     * @example #Log a warning message (which will cause a stack trace to be shown)
     *     var entity = new IgeEntity();
     *
     *     // Will output (stack trace is just an example here, real one will be more useful):
     *     //    Stack: {anonymous}()@<anonymous>:2:8
     *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
     *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
     *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
     *     //    IGE *warning* [IgeEntity] : A test warning
     *     entity.log('A test warning', 'warning');
     * @example #Log an error message (which will cause an exception to be raised and a stack trace to be shown)
     *     var entity = new IgeEntity();
     *
     *     // Will output (stack trace is just an example here, real one will be more useful):
     *     //    Stack: {anonymous}()@<anonymous>:2:8
     *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
     *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
     *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
     *     //    IGE *error* [IgeEntity] : An error message
     *     entity.log('An error message', 'error');
     *
     */
    log(message, ...args) {
        let indent = "";
        if (global._globalLogIndent) {
            indent = "|";
        }
        for (let i = 0; i < global._globalLogIndent; i++) {
            indent += "———";
        }
        if (global._globalLogIndent) {
            indent += " ";
        }
        console.log(indent + message, ...args);
        return this;
    }
    logIndent() {
        global._globalLogIndent++;
    }
    logOutdent() {
        global._globalLogIndent--;
        if (global._globalLogIndent < 0)
            global._globalLogIndent = 0;
    }
    data(key, value) {
        if (value !== undefined) {
            this._data = this._data || {};
            this._data[key] = value;
            return this;
        }
        if (this._data) {
            return this._data[key];
        }
        return null;
    }
}
