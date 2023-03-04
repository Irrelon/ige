import IgeEventingClass from "./IgeEventingClass";

class IgeComponent<TargetClass> extends IgeEventingClass {
	_entity: TargetClass;
	_options?: any;
	componentId: string = "IgeComponent";
	destroy?: () => void;

	constructor (parent: TargetClass, options?: any) {
		super();
		this._entity = parent;
		this._options = options;
	}
}

export default IgeComponent;
