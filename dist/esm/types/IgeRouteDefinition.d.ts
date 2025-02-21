import type { IgeEffectFunction } from "./IgeEffectFunction.js"
export interface IgeRouteDefinition<RouteHandlerProps extends any[] = any[]> {
    shared?: IgeEffectFunction<RouteHandlerProps>;
    client?: IgeEffectFunction<RouteHandlerProps>;
    server?: IgeEffectFunction<RouteHandlerProps>;
}
