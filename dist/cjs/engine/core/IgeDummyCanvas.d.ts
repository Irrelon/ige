import { IgeDummyContext } from "./IgeDummyContext.js"
export declare class IgeDummyCanvas {
    dummy: boolean;
    width: number;
    height: number;
    getContext: (type: string) => IgeDummyContext;
}
