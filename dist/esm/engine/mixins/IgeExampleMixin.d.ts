import type { Mixin } from "@/types/Mixin";
import type { IgeBaseClass } from "../core/IgeBaseClass";

export declare const WithExampleMixin: <BaseClassType extends Mixin<IgeBaseClass>>(
	Base: BaseClassType
) => {
	new (...args: any[]): {
		classId: string;
		_data: Record<string, any>;
		getClassId(): string;
		log(message: string, ...args: any[]): any;
		logIndent(): void;
		logOutdent(): void;
		data(key: string, value: any): any;
		data(key: string): any;
	};
} & BaseClassType;
