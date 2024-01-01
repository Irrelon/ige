export type IgeEffectFunction = () => Promise<any>;

export interface IgeRouteDefinition {
	shared?: IgeEffectFunction;
	client?: IgeEffectFunction;
	server?: IgeEffectFunction;
}
