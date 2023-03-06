import { arrPull } from "../services/utils";

export class IgeArrayRegister<RegisterType extends Record<string, any>> {
	_store: Record<string, RegisterType[]> = {};
	_field: string = "";
	_registeredField: string = "";

	constructor (field: string, registeredField: string) {
		this._field = field;
		this._registeredField = registeredField;
	}


	get (id: string) {
		return this._store[id] || [];
	}

	/**
	 * Register an object with the engine array register.
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	add (obj: RegisterType) {
		const objFieldValue = obj[this._field] as string;
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
	remove (obj: RegisterType) {
		const objFieldValue = obj[this._field] as string;

		if (!this._store[objFieldValue]) {
			return this;
		}

		arrPull(this._store[objFieldValue], obj);

		// @ts-ignore
		obj[this._registeredField] = false;

		return this;
	}
}