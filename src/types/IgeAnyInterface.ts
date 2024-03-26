export type IgeAnyInterface<T> = {
	[K in keyof T]: T[K];
};
