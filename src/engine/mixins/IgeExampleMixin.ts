import type { IgeBaseClass } from "@/export/exports";
import type { IgeMixin } from "@/export/exports";

export const WithExampleMixin = <BaseClassType extends IgeMixin<IgeBaseClass>> (Base: BaseClassType) =>
	class extends Base {
	};
