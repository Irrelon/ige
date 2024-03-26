import { IgeEventingClass } from "@/engine/core/IgeEventingClass";

export class IgeComponent<EntityType> extends IgeEventingClass {
	_entity: EntityType;
	_options?: any;
	componentId: string = "IgeComponent";

	constructor (parent: EntityType, options?: any) {
		super();
		this._entity = parent;
		this._options = options;
	}

	destroy () {
		return this;
	}
}
