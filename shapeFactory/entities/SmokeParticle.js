import { IgeParticle } from "@/engine/core/IgeParticle";
import { ige } from "@/engine/instance";
export class SmokeParticle extends IgeParticle {
    constructor(emitter) {
        super(emitter);
        this.classId = 'SmokeParticle';
        // Setup the particle default values
        this.texture(ige.textures.get("smoke"))
            .cell(1)
            .width(50)
            .height(50)
            .drawBounds(false)
            .drawBoundsData(false);
    }
}
