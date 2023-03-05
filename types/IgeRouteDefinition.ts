import IgeSceneGraph from "../engine/core/IgeSceneGraph";
import IgeRouteController from "../engine/core/IgeRouteController";
import IgeRouteTextures from "../engine/core/IgeRouteTextures";

export interface IgeRouteDefinitionClient {
	controller: typeof IgeRouteController;
	sceneGraph: typeof IgeSceneGraph;
	textures: typeof IgeRouteTextures;
}

export interface IgeRouteDefinitionServer {
	controller: typeof IgeRouteController;
	sceneGraph: typeof IgeSceneGraph;
}

export interface IgeRouteDefinition {
	client: IgeRouteDefinitionClient;
	server: IgeRouteDefinitionServer;
}