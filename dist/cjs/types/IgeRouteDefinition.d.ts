declare const UNDEFINED_VOID_ONLY: unique symbol;
type Destructor = () => Promise<void | {
    [UNDEFINED_VOID_ONLY]: never;
}>;
export type IgeEffectFunction<PropType extends any[] = any[]> = (...props: PropType) => Promise<void | Destructor>;
export interface IgeRouteDefinition<RouteHandlerProps extends any[] = any[]> {
    shared?: IgeEffectFunction<RouteHandlerProps>;
    client?: IgeEffectFunction<RouteHandlerProps>;
    server?: IgeEffectFunction<RouteHandlerProps>;
}
export {};
