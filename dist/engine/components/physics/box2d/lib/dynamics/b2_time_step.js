/*
* Copyright (c) 2006-2011 Erin Catto http://www.box2d.org
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
import { b2MakeArray } from "../common/b2_settings.js"
import { b2Vec2 } from "../common/b2_math.js"
/// Profiling data. Times are in milliseconds.
export class b2Profile {
    step = 0;
    collide = 0;
    solve = 0;
    solveInit = 0;
    solveVelocity = 0;
    solvePosition = 0;
    broadphase = 0;
    solveTOI = 0;
    Reset() {
        this.step = 0;
        this.collide = 0;
        this.solve = 0;
        this.solveInit = 0;
        this.solveVelocity = 0;
        this.solvePosition = 0;
        this.broadphase = 0;
        this.solveTOI = 0;
        return this;
    }
}
/// This is an internal structure.
export class b2TimeStep {
    dt = 0; // time step
    inv_dt = 0; // inverse time step (0 if dt == 0).
    dtRatio = 0; // dt * inv_dt0
    velocityIterations = 0;
    positionIterations = 0;
    // #if B2_ENABLE_PARTICLE
    particleIterations = 0;
    // #endif
    warmStarting = false;
    Copy(step) {
        this.dt = step.dt;
        this.inv_dt = step.inv_dt;
        this.dtRatio = step.dtRatio;
        this.positionIterations = step.positionIterations;
        this.velocityIterations = step.velocityIterations;
        // #if B2_ENABLE_PARTICLE
        this.particleIterations = step.particleIterations;
        // #endif
        this.warmStarting = step.warmStarting;
        return this;
    }
}
export class b2Position {
    c = new b2Vec2();
    a = 0;
    static MakeArray(length) {
        return b2MakeArray(length, (i) => new b2Position());
    }
}
export class b2Velocity {
    v = new b2Vec2();
    w = 0;
    static MakeArray(length) {
        return b2MakeArray(length, (i) => new b2Velocity());
    }
}
export class b2SolverData {
    step = new b2TimeStep();
    positions;
    velocities;
}
