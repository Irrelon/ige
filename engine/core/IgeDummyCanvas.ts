import IgeDummyContext from "./IgeDummyContext";

class IgeDummyCanvas {
    dummy = true;
    width = 0;
    height = 0;

    getContext = (type: string) => {
        return IgeDummyContext;
    };
}

export default IgeDummyCanvas;
