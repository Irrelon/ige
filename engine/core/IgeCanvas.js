export const newCanvas = () => {
    const instance = new OffscreenCanvas(2, 2);
    Object.defineProperty(instance, "_igeTextures", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: []
    });
    Object.defineProperty(instance, "_loaded", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: false
    });
    return instance;
};
