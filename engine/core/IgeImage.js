export class IgeImage extends Image {
    constructor() {
        super(...arguments);
        this._igeTextures = [];
        this._loaded = false;
    }
}
