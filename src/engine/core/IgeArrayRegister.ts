import { arrPull } from "@/export/exports";

export class IgeArrayRegister<RegisterType extends Record<string, any>> {
	_store: Record<string, RegisterType[]> = {};
	_field: string = "";
	_registeredField: string = "";

	constructor (field: string, registeredField: string) {
		this._field = field;
		this._registeredField = registeredField;
	}

	/**
	 * Returns the reference to the store array for the
	 * specified id. Warning, you are given the actual
	 * reference to the array so mutating it will affect
	 * all other references. Use getImmutable() to get
	 * a mutation-safe version.
	 * @param id
	 */
	get (id: string): RegisterType[] {
		this._store[id] = this._store[id] || [];
		return this._store[id];
	}

	/**
	 * Gets an array of the store data by id. The returned
	 * array is not by reference, so you can mutate it safely.
	 * @param id
	 */
	getImmutable (id: string): RegisterType[] {
		return [...(this._store[id] || [])];
	}

	/**
	 * Register an object with the engine array register.
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	add (obj: RegisterType): this {
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
	remove (obj: RegisterType): this {
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
