import igeConfig from "./config.js";
import Ige from "./Ige";
import IgeComponent from "./IgeComponent";

class IgeBaseClass {
	classId = "IgeBaseClass";
	components: Record<string, IgeComponent> = {};
	_components: IgeComponent[] = []; // TODO: Rename this to _componentsArr
	_ige?: Ige;
	_data: Record<string, any> = {};

	constructor (ige?: Ige) {
		if (!ige) { return; }

		if (ige.constructor.name !== "Ige") {
			throw new Error(`First argument passed to ${this.classId} is not an instance of Ige (${ige.constructor.name})!`);
		}

		this.ige(ige);
	}

	static mixin (targetObject: IgeBaseClass, mixinObj: any, overwrite = false) {
		const obj = mixinObj.prototype || mixinObj;

		// Copy the class object's properties to (this)
		for (const key in obj) {
			// Only copy the property if this doesn't already have it
			// @ts-ignore
			if (Object.prototype.hasOwnProperty.call(obj, key) && (overwrite || targetObject[key] === undefined)) {
				// @ts-ignore
				targetObject[key] = obj[key];
			}
		}
	}

	/**
	 * Removes the passed item from an array, the opposite of push().
	 * @param arr
	 * @param item
	 * @return {number} The array index that was removed
	 */
	static pull (arr: any[], item: any): number {
		const index = arr.indexOf(item);

		if (index === -1) {
			return -1;
		}

		arr.splice(index, 1);
		return index;
	}

	/**
	 * Adds an item to an array, only if it does not already exist in the array.
	 * @param arr
	 * @param item
	 * @return {Boolean} True if the item was added, false if it already exists.
	 */
	static pushUnique (arr: any[], item: any): boolean {
		const index = arr.indexOf(item);

		if (index > -1) {
			return false;
		}

		arr.push(item);
		return true;
	}

	/**
	 * Clones the array and returns a new non-referenced
	 * array.
	 * @param arr
	 * @return {*}
	 */
	static cloneArray (arr: any[]) {
		const newArray: any[] = [];
		let key;

		for (key in arr) {
			if (Object.prototype.hasOwnProperty.call(arr, key)) {
				if (arr[key] instanceof Array) {
					newArray[key] = this.cloneArray(arr[key]);
				} else {
					newArray[key] = arr[key];
				}
			}
		}

		return newArray;
	}

	/**
	 * Checks if the
	 * property values of this object are equal to the property values
	 * of the passed object. If they are the same then this method will
	 * return true. Objects must not contain circular references!
	 * @param {Object} obj1 The first object to compare to.
	 * @param {Object} obj2 The other object to compare to.
	 * @return {Boolean}
	 */
	static theSameAs (obj1: any, obj2: any): boolean {
		return JSON.stringify(obj1) === JSON.stringify(obj2);
	}

	/**
	 * Iterates through an array's items and calls each item's
	 * destroy() method if it exists. Useful for destroying an
	 * array of IgeEntity instances.
	 */
	static destroyAll (arr: any[]) {
		const arrCount = arr.length;

		for (let i = arrCount - 1; i >= 0; i--) {
			if (typeof(arr[i].destroy) === "function") {
				arr[i].destroy();
			}
		}
	}

	/**
	 * Stores a pre-calculated PI / 180 value.
	 * @type {Number}
	 */
	static PI180 = Math.PI / 180;

	/**
	 * Stores a pre-calculated 180 / PI value.
	 * @type {Number}
	 */
	static PI180R = 180 / Math.PI;

	static toIso (x: number, y: number, z: number) {
		const sx = x - y;
		const sy = (-z) * 1.2247 + (x + y) * 0.5;

		return {"x": sx, "y": sy};
	}

	/**
	 * Converts degrees to radians.
	 * @param {Number} degrees
	 * @return {Number} radians
	 */
	static degreesToRadians (degrees: number) {
		return degrees * this.PI180;
	}

	/**
	 * Converts radians to degrees.
	 * @param {Number} radians
	 * @return {Number} degrees
	 */
	static radiansToDegrees (radians: number) {
		return radians * this.PI180R;
	}

	/**
	 * Calculates the distance from the first point to the second point.
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @return {Number}
	 */
	static distance (x1: number, y1: number, x2: number, y2: number) {
		return Math.sqrt(((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2)));
	}

	ige (ige: Ige) {
		this._ige = ige;
		return this;
	}

	/**
	 * Provides logging capabilities to all IgeBaseClass instances.
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
	log (...args: any[]) {
		console.log(...args);
		if (igeConfig.debug._enabled) {

		}

		return this;
	}

	data (key?: string, value?: any) {
		if (key === undefined) {
			return;
		}

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

	/**
	 * Returns the class id. Primarily used to help identify
	 * what class an instance was instantiated with and is also
	 * output during the ige.scenegraph() method's console logging
	 * to show what class an object belongs to.
	 * @example #Get the class id of an object
	 *     var entity = new IgeEntity();
	 *
	 *     // Will output "IgeEntity"
	 *     console.log(entity.classId);
	 */
	getClassId () {
		return this.classId;
	}

	/**
	 * Creates a new instance of the component argument passing
	 * the options argument to the component as it is initialised.
	 * The new component instance is then added to "this" via
	 * a property name that is defined in the component class as
	 * "componentId".
	 * @param {IgeBaseClass} component The class definition of the component.
	 * @param {Object=} options An options parameter to pass to the component
	 * on init.
	 * @example #Add the velocity component to an entity
	 *     var entity = new IgeEntity();
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, we can access
	 *     // the component via its namespace. Call the
	 *     // "byAngleAndPower" method of the velocity component:
	 *     entity.velocity.byAngleAndPower(IgeBaseClass.degreesToRadians(20), 0.1);
	 */
	addComponent (component: typeof IgeComponent, options?: any) {
		if (component.componentTargetClass) {
			// Check that the entity we are adding this component to is the correct type
			if (this.constructor.name !== component.componentTargetClass) {
				throw new Error(`${component.constructor.name} expected to be added to instance of [${component.componentTargetClass}] but was added to [${this.constructor.name}]`);
			}
		}

		const newComponentInstance = new component(this._ige as Ige, this, options);

		this.components[newComponentInstance.componentId] = newComponentInstance;

		// Add the component reference to the class component array
		this._components = this._components || [];
		this._components.push(newComponentInstance);

		return this;
	}

	/**
	 * Removes a component by its id.
	 * @param {String} componentId The id of the component to remove.
	 * @example #Remove a component by its id (namespace)
	 *     var entity = new IgeEntity();
	 *
	 *     // Let's add the velocity component
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, let's remove
	 *     // it via it's id ("velocity")
	 *     entity.removeComponent('velocity');
	 */
	removeComponent (componentId: string) {
		// If the component has a destroy method, call it
		const component = this.components[componentId];
		if (component && component.destroy) {
			component.destroy();
		}

		// Remove the component from the class component array
		if (this._components) {
			IgeBaseClass.pull(this._components, component);
		}

		// Remove the component from the class object
		delete this.components[componentId];
		return this;
	}
}

export default IgeBaseClass;
