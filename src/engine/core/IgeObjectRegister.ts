import { IgeCanRegisterById } from "@/types/IgeCanRegisterById";
import { IgeCanBeDestroyed } from "@/types/IgeCanBeDestroyed";

export class IgeObjectRegister {
	_store: Record<string, IgeCanRegisterById & IgeCanBeDestroyed> = {};

	get (id: string) {
		return this._store[id];
	}

	all () {
		return this._store;
	}

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by its id with
	 * a call to ige.$(objectId).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	add (obj: IgeCanRegisterById & IgeCanBeDestroyed) {
		if (this._store[obj.id()]) {
			obj._idRegistered = false;
			throw new Error(`Cannot add object id "${obj.id()}" to scenegraph because there is already another object in the graph with the same ID!`);
		}

		this._store[obj.id()] = obj;
		obj._idRegistered = true;

		return this;
	}

	/**
	 * Un-register an object with the engine object register. The
	 * object will no longer be accessible via ige.$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	remove (obj: IgeCanRegisterById) {
		// Check if the object is registered in the ID lookup
		if (!this._store[obj.id()]) {
			return;
		}

		delete this._store[obj.id()];
		obj._idRegistered = false;
	}
}
