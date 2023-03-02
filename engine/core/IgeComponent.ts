import IgeEventingClass from "./IgeEventingClass";
import type Ige from "./Ige";

class IgeComponent extends IgeEventingClass {
	static componentTargetClass?: string;
	componentId: string = "IgeComponent";
	destroy?: () => void;

	constructor(ige: Ige, parent?: any, options?: any) {
		super(ige);
	}
}

export default IgeComponent;
