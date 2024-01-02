import { arrPull } from "../utils";

export class IgeArrayRegister {
	constructor(field, registeredField) {
		this._store = {};
		this._field = "";
		this._registeredField = "";
		this._field = field;
		this._registeredField = registeredField;
	}
	get(id) {
		return this._store[id] || [];
	}
	/**
	 * Register an object with the engine array register.
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	add(obj) {
		const objFieldValue = obj[this._field];
		this._store[objFieldValue] = this._store[objFieldValue] || [];
		this._store[objFieldValue].push(obj);
		// @ts-ignore
		obj[this._registeredField] = true;
		return this;
	}
	/**
	 * Un-register an object with the engine array register.
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	remove(obj) {
		const objFieldValue = obj[this._field];
		if (!this._store[objFieldValue]) {
			return this;
		}
		arrPull(this._store[objFieldValue], obj);
		// @ts-ignore
		obj[this._registeredField] = false;
		return this;
	}
}
