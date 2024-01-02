import { IgeEventingClass } from "./IgeEventingClass";

export class IgeComponent extends IgeEventingClass {
	constructor(parent, options) {
		super();
		this.componentId = "IgeComponent";
		this._entity = parent;
		this._options = options;
	}
	destroy() {
		return this;
	}
}
