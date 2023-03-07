import IgeSceneGraph from "../engine/core/IgeSceneGraph";

export interface IgeRouteDefinitionParts {
	controller?: IgeSceneGraph;
	sceneGraph?: IgeSceneGraph;
	textures?: IgeSceneGraph;
}

export interface IgeRouteDefinition extends IgeRouteDefinitionParts {
	client?: IgeRouteDefinitionParts,
	server?: IgeRouteDefinitionParts
}