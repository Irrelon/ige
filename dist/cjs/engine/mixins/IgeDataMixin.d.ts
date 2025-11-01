import type { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeMixin } from "../../types/IgeMixin.js";
export declare const WithDataMixin: <BaseClassType extends IgeMixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _data: Record<string, any>;
        data(key: string, value: any): any;
        data(key: string): any;
        classId: string;
        _logEnabled: boolean;
        getClassId(): string;
        logEnabled(val?: boolean): any | boolean;
        log(message: string, ...args: any[]): any | undefined;
        logInfo(message: string, ...args: any[]): any | undefined;
        logWarn(message: string, ...args: any[]): any | undefined;
        logError(message: string, ...args: any[]): any | undefined;
        logIndent(): void;
        logOutdent(): void;
    };
} & BaseClassType;
