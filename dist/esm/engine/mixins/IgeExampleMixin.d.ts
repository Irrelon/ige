import type { IgeBaseClass } from "../../export/exports.js"
import type { Mixin } from "../../export/exports.js"
export declare const WithExampleMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        classId?: string | undefined;
        _data: Record<string, any>;
        getClassId(): string | undefined;
        log(message: string, ...args: any[]): any;
        logInfo(message: string, ...args: any[]): any;
        logWarn(message: string, ...args: any[]): any;
        logError(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
