import type { IgeBaseClass } from "../core/IgeBaseClass";
export declare const WithDataMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (): {
        _data: Record<string, any>;
        data(key: string, value: any): this;
        data(key: string): any;
    };
};
