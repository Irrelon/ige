import type { IgeDummyContext } from "./IgeDummyContext";

export declare class IgeDummyCanvas {
	dummy: boolean;
	width: number;
	height: number;
	getContext: (type: string) => IgeDummyContext;
}
