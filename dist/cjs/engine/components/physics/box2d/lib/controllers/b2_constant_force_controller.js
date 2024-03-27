"use strict";
/*
 * Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2ConstantForceController = void 0;
// #if B2_ENABLE_CONTROLLER
const b2_controller_1 = require("./b2_controller");
const b2_math_1 = require("../common/b2_math");
/**
 * Applies a force every frame
 */
class b2ConstantForceController extends b2_controller_1.b2Controller {
    constructor() {
        super(...arguments);
        /**
         * The force to apply
         */
        this.F = new b2_math_1.b2Vec2(0, 0);
    }
    Step(step) {
        for (let i = this.m_bodyList; i; i = i.nextBody) {
            const body = i.body;
            if (!body.IsAwake()) {
                continue;
            }
            body.ApplyForce(this.F, body.GetWorldCenter());
        }
    }
    Draw(draw) {
    }
}
exports.b2ConstantForceController = b2ConstantForceController;
// #endif
