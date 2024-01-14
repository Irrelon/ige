export type IgeAsyncFunction<ReturnType> = () => Promise<ReturnType>;
export type IgeEffectFunction = IgeAsyncFunction<IgeAsyncFunction<void>>;
export interface IgeRouteDefinition {
    shared?: IgeEffectFunction;
    client?: IgeEffectFunction;
    server?: IgeEffectFunction;
}
