import type { IgeBaseClass } from "../core/IgeBaseClass";
import type { Mixin } from "@/types/Mixin";
 
export const WithExampleMixin = <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) =>
	class extends Base {};
