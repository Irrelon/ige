import type { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeMixin } from "@/types/IgeMixin";

export const WithExampleMixin = <BaseClassType extends IgeMixin<IgeBaseClass>> (Base: BaseClassType) =>
	class extends Base {
	};
