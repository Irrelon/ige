import { IgeDummyContext } from "./IgeDummyContext.js"
export class IgeDummyCanvas {
    dummy = true;
    width = 0;
    height = 0;
    getContext = (type) => {
        return new IgeDummyContext();
    };
}
