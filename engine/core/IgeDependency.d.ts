import { IgeDependencyAction } from "@/engine/core/IgeBaseClass";
export declare class IgeDependency {
    _dependencyFulfilled: Record<string, boolean>;
    _dependsOnArr: IgeDependencyAction[];
    addDependency(dependencyName: string, dependencyPromise: Promise<any>): void;
    dependsOn(dependencyList: string[], actionToTake: (...args: any[]) => any): void;
    _onDependencySatisfied(dependencyName: string): void;
    _isDependencyListSatisfied(dependencyList: string[]): boolean;
}
