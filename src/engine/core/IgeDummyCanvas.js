import { IgeDummyContext } from "./IgeDummyContext";
export class IgeDummyCanvas {
    constructor() {
        this.dummy = true;
        this.width = 0;
        this.height = 0;
        this.getContext = (type) => {
            return new IgeDummyContext();
        };
    }
}