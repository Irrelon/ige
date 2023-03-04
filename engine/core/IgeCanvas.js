class IgeCanvas extends HTMLCanvasElement {
    constructor() {
        super(...arguments);
        this._igeTextures = [];
        this._loaded = false;
    }
}
export default IgeCanvas;
