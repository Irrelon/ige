import type { IgeBaseClass } from "../../export/exports.js"
import type { Mixin } from "../../export/exports.js"
export declare const WithDataMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _data: Record<string, any>;
        data(key: string, value: any): this;
        data(key: string): any;
        classId?: string | undefined;
        getClassId(): string | undefined;
        log(message: string, ...args: any[]): any;
        logInfo(message: string, ...args: any[]): any;
        logWarn(message: string, ...args: any[]): any;
        logError(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
    };
} & BaseClassType;
