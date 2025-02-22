export interface IgeCanAsyncLoad {
	_loaded: boolean;
	whenLoaded: () => Promise<this>;
}
