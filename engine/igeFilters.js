export class IgeFilters {
    constructor() {
        this.filter = {};
        this.helper = {};
        if (typeof window === "undefined") {
            return;
        }
        this.tmpCanvas = new OffscreenCanvas(2, 2);
        this.tmpCtx = this.tmpCanvas.getContext("2d");
    }
    getFilter(name) {
        return this.filter[name];
    }
    registerFilter(name, filter) {
        this.filter[name] = filter;
    }
    getHelper(name) {
        return this.helper[name];
    }
    registerHelper(name, filter) {
        this.helper[name] = filter;
    }
}
export const igeFilters = new IgeFilters();
