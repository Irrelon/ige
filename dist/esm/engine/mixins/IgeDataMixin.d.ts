import type { Mixin } from "@/types/Mixin";
import type { IgeBaseClass } from "../core/IgeBaseClass";
export declare const WithDataMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _data: Record<string, any>;
        data(key: string, value: any): this;
        data(key: string): any;
        classId: string;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
    };
} & BaseClassType;