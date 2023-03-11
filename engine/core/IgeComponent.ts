import IgeEventingClass from "./IgeEventingClass";

class IgeComponent extends IgeEventingClass {
	_entity: any;
	_options?: any;
	componentId: string = "IgeComponent";
	destroy?: () => void;

	constructor (parent: any, options?: any) {
		super();
		this._entity = parent;
		this._options = options;
	}
}

export default IgeComponent;
