import type { IgeEffectFunction } from "@/types/IgeEffectFunction";

export interface IgeRouteDefinition<RouteHandlerProps extends any[] = any[]> {
	shared?: IgeEffectFunction<RouteHandlerProps>;
	client?: IgeEffectFunction<RouteHandlerProps>;
	server?: IgeEffectFunction<RouteHandlerProps>;
}

// const rd: IgeRouteDefinition<[{ name: string }]> = {
// 	client: async () => {
// 		return async () => {
//
// 		};
// 	}
// };
