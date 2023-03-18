export type IgeRouteFunction = () => Promise<any>;

export interface IgeRouteDefinition {
	shared?: IgeRouteFunction;
	client?: IgeRouteFunction;
	server?: IgeRouteFunction;
}
