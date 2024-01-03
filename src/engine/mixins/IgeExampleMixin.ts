import type { IgeBaseClass } from "@/export/exports";
import type { Mixin } from "@/export/exports";

export const WithExampleMixin = <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) =>
	class extends Base {};
