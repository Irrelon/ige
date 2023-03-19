import type { Mixin } from "@/types/Mixin";
import type { IgeBaseClass } from "../core/IgeBaseClass";
export declare const WithExampleMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        classId: string;
        _dependencyFulfilled: Record<string, boolean>;
        _dependsOnArr: import("../core/IgeBaseClass").IgeDependencyAction[];
        addDependency(dependencyName: string, dependencyPromise: Promise<any>): void;
        dependsOn(dependencyList: string[], actionToTake: (...args: any[]) => any): void;
        _onDependencySatisfied(dependencyName: string): void;
        _isDependencyListSatisfied(dependencyList: string[]): boolean;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        _data: Record<string, any>;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
