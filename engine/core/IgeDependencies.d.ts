export interface IgeDependencyAction {
    dependencyList: string[];
    actionToTake: (...args: any[]) => any;
}
export declare class IgeDependencies {
    _dependencyFulfilled: Record<string, boolean>;
    _dependsOnArr: IgeDependencyAction[];
    add(dependencyName: string, dependencyPromise: Promise<any>): void;
    waitFor(dependencyList: string[], actionToTake: (...args: any[]) => any): void;
    _onDependencySatisfied(dependencyName: string): void;
    _isDependencyListSatisfied(dependencyList: string[]): boolean;
}
