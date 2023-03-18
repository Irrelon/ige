import { IgeRouteDefinition } from "../../types/IgeRouteDefinition";
import IgeBaseClass from "./IgeBaseClass";
export declare class IgeRouter extends IgeBaseClass {
    _routeLoad: Record<string, IgeRouteDefinition>;
    _routeUnload: Record<string, any>;
    _currentRoutePath: string;
    _routeQueue: (() => Promise<boolean | undefined | void>)[];
    _executingSeries: boolean;
    route(path?: string, definition?: IgeRouteDefinition): IgeRouteDefinition | this | Record<string, IgeRouteDefinition>;
    go(path: string): Promise<void>;
    _pathJoin(path1?: string, path2?: string): string;
    _routeAdd(path: string): void;
    _routeRemove(path?: string): void;
    _processQueue(): void;
}
