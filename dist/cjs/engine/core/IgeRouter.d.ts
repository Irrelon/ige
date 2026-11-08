import { IgeBaseClass } from "./IgeBaseClass.js"
import type { IgeRouteDefinition } from "../../types/IgeRouteDefinition.js"
export declare class IgeRouter extends IgeBaseClass {
    classId: string;
    _routeLoad: Record<string, IgeRouteDefinition>;
    _routeUnload: Record<string, any>;
    _currentRoutePath: string;
    _routeQueue: (() => Promise<boolean | undefined | void>)[];
    _executingSeries: boolean;
    /**
     * Sets or gets the route handler(s) for a given path.
     *
     * @param path The path for the route.
     * @param definition The definition for the route.
     * @returns Returns this object when setting a route, returns the
     * definition for a given path when getting a route, or returns all
     * routes if no arguments are provided.
     */
    route(path: string, definition: IgeRouteDefinition): this;
    route(path: string): IgeRouteDefinition;
    route(): Record<string, IgeRouteDefinition>;
    /**
     * Navigate to a given path and execute the corresponding route handler(s).
     *
     * @param {string} path The path to navigate to.
     * @param {...any} args Additional arguments to pass to the route handler(s).
     * @throws {Error} If the route defined for the given path does not exist.
     */
    go(path: string, ...args: any[]): Promise<void>;
    _pathJoin(path1?: string, path2?: string): string;
    _routeAdd(path: string): void;
    _routeRemove(path?: string): void;
    _processQueue(): void;
}
