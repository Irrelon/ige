export type AnyInterface<T> = {
	[K in keyof T]: T[K];
};
