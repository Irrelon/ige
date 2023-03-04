import { ige } from "../../../engine/instance.js";
import { Rotator } from "./Rotator.js";
import { createChildRotators } from "./ChildRotators.js";
export class Fairy extends Rotator {
    constructor(speed) {
        super(speed);
        const client = ige.client;
        this.depth(1)
            .width(100)
            .height(100)
            .texture(client.gameTexture.fairy)
            .translateTo(0, 0, 0)
            .mount(ige.$('scene1'));
        const arr = createChildRotators(this, 200, 0.05);
        const arrBox1 = createChildRotators(arr[0], 120, -0.2);
        const arrBox2 = createChildRotators(arr[1], 120, -0.2);
        const arrBox3 = createChildRotators(arr[2], 120, -0.2);
        const arrBox4 = createChildRotators(arr[3], 120, -0.2);
        createChildRotators(arrBox1[0], 80, -0.4);
        createChildRotators(arrBox1[1], 80, -0.4);
        createChildRotators(arrBox1[2], 80, -0.4);
        createChildRotators(arrBox1[3], 80, -0.4);
        createChildRotators(arrBox2[0], 80, -0.4);
        createChildRotators(arrBox2[1], 80, -0.4);
        createChildRotators(arrBox2[2], 80, -0.4);
        createChildRotators(arrBox2[3], 80, -0.4);
        createChildRotators(arrBox3[0], 80, -0.4);
        createChildRotators(arrBox3[1], 80, -0.4);
        createChildRotators(arrBox3[2], 80, -0.4);
        createChildRotators(arrBox3[3], 80, -0.4);
        createChildRotators(arrBox4[0], 80, -0.4);
        createChildRotators(arrBox4[1], 80, -0.4);
        createChildRotators(arrBox4[2], 80, -0.4);
        createChildRotators(arrBox4[3], 80, -0.4);
    }
}
