import WithComponentMixin from "engine/mixins/IgeComponentMixin";
import IgeBaseClass from "./IgeBaseClass";

class IgeComponent extends IgeBaseClass {
	static componentTargetClass?: string;
	componentId: string = "IgeComponent";
	destroy?: () => void;
	_options?: any;
	_entity: typeof WithComponentMixin;

	constructor(parent: typeof WithComponentMixin, options?: any) {
		super();
		this._entity = parent;
		this._options = options;
	}
}

export default IgeComponent;
