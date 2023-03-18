import { IgeEntity } from "../core/IgeEntity";
import { IgeTexture } from "../core/IgeTexture";
import IgeCuboidSmartTexture from "../textures/IgeCuboidSmartTexture";
export class IgeCuboid extends IgeEntity {
    constructor() {
        super();
        this.classId = 'IgeCuboid';
        this.bounds3d(40, 40, 40);
        const tex = new IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture);
        this.texture(tex);
    }
}
