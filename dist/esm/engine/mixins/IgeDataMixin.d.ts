import type { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeMixin } from "../../types/IgeMixin.js"
export declare const WithDataMixin: <BaseClassType extends IgeMixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _data: Record<string, any>;
        data(key: string, value: any): this;
        data(key: string): any;
        classId: string;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logInfo(message: string, ...args: any[]): any;
        logWarn(message: string, ...args: any[]): any;
        logError(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
    };
} & BaseClassType;
