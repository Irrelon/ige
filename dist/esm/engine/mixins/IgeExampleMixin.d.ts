import type { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeMixin } from "../../types/IgeMixin.js"
export declare const WithExampleMixin: <BaseClassType extends IgeMixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        classId: string;
        _data: Record<string, any>;
        getClassId(): string;
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
