import { IgeEntity } from "../../export/exports.js"
import { IgeTexture } from "../../export/exports.js"
import { IgeCuboidSmartTexture } from "../../export/exports.js"
export class IgeCuboid extends IgeEntity {
    classId = "IgeCuboid";
    constructor() {
        super();
        this.bounds3d(40, 40, 40);
        const tex = new IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture);
        this.texture(tex);
    }
}
