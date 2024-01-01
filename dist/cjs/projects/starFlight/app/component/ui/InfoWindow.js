"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoWindow = void 0;
const IgeUiLabel_1 = require("../../../../../engine/ui/IgeUiLabel.js");
const IgeUiEntity_1 = require("../../../../../engine/core/IgeUiEntity.js");
const Tab_1 = require("./Tab");
const instance_1 = require("../../../../../engine/instance.js");
class InfoWindow extends IgeUiEntity_1.IgeUiEntity {
    constructor(options) {
        super();
        this.classId = "InfoWindow";
        if (options.label) {
            this._label = new IgeUiLabel_1.IgeUiLabel()
                .layer(1)
                .font(options.labelFont || "8px Verdana")
                .height(12)
                .width(100)
                .left(0)
                .top(5)
                .textAlignX(0)
                .textAlignY(1)
                .textLineSpacing(12)
                .color("#7bdaf1")
                .value(options.label)
                .mount(this);
        }
        if (options.tab) {
            // Create toggle tab for the window
            this._tab = new Tab_1.Tab(options.tab)
                .mount(this);
        }
        this.texture(instance_1.ige.textures.get("infoWindow"));
        this.windowGradient("#04b7f9", "#005066", "#04b7f9");
    }
    show() {
        super.show();
        if (this._label) {
            this._label.width(this.width());
        }
        this.windowGradient("#04b7f9", "#005066", "#04b7f9");
        return this;
    }
    windowGradient(color1, color2, color3) {
        if (!instance_1.ige.engine._ctx)
            return;
        const gradient = instance_1.ige.engine._ctx.createLinearGradient(0, 0, this.width(), this.height());
        if (!gradient)
            return;
        this._windowGradient = gradient;
        this._windowGradient.addColorStop(0.0, color1);
        this._windowGradient.addColorStop(0.5, color2);
        this._windowGradient.addColorStop(1.0, color3);
    }
}
exports.InfoWindow = InfoWindow;
