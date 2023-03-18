import IgeDummyContext from "./IgeDummyContext";
declare class IgeDummyCanvas {
    dummy: boolean;
    width: number;
    height: number;
    getContext: (type: string) => IgeDummyContext;
}
export default IgeDummyCanvas;
