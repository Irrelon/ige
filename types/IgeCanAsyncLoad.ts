export interface IgeCanAsyncLoad {
	_loaded: boolean;
	whenLoaded: () => Promise<boolean>;
}