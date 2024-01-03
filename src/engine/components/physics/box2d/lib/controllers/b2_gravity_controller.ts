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

// #if B2_ENABLE_CONTROLLER

import { b2Controller } from "./b2_controller.js";
import { b2TimeStep } from "../dynamics/b2_time_step.js";
import { b2_epsilon } from "../common/b2_settings.js";
import { b2Sqrt, b2Vec2 } from "../common/b2_math.js";
import { b2Draw } from "../common/b2_draw.js";

/**
 * Applies simplified gravity between every pair of bodies
 */
export class b2GravityController extends b2Controller {
  /**
   * Specifies the strength of the gravitiation force
   */
  public G = 1;
  /**
   * If true, gravity is proportional to r^-2, otherwise r^-1
   */
  public invSqr = true;

  /**
   * @see b2Controller::Step
   */
  public Step(step: b2TimeStep) {
    if (this.invSqr) {
      for (let i = this.m_bodyList; i; i = i.nextBody) {
        const body1 = i.body;
        const p1 = body1.GetWorldCenter();
        const mass1 = body1.GetMass();
        for (let j = this.m_bodyList; j && j !== i; j = j.nextBody) {
          const body2 = j.body;
          const p2 = body2.GetWorldCenter();
          const mass2 = body2.GetMass();
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const r2 = dx * dx + dy * dy;
          if (r2 < b2_epsilon) {
            continue;
          }
          const f = b2GravityController.Step_s_f.Set(dx, dy);
          f.SelfMul(this.G / r2 / b2Sqrt(r2) * mass1 * mass2);
          if (body1.IsAwake()) {
            body1.ApplyForce(f, p1);
          }
          if (body2.IsAwake()) {
            body2.ApplyForce(f.SelfMul(-1), p2);
          }
        }
      }
    } else {
      for (let i = this.m_bodyList; i; i = i.nextBody) {
        const body1 = i.body;
        const p1 = body1.GetWorldCenter();
        const mass1 = body1.GetMass();
        for (let j = this.m_bodyList; j && j !== i; j = j.nextBody) {
          const body2 = j.body;
          const p2 = body2.GetWorldCenter();
          const mass2 = body2.GetMass();
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const r2 = dx * dx + dy * dy;
          if (r2 < b2_epsilon) {
            continue;
          }
          const f = b2GravityController.Step_s_f.Set(dx, dy);
          f.SelfMul(this.G / r2 * mass1 * mass2);
          if (body1.IsAwake()) {
            body1.ApplyForce(f, p1);
          }
          if (body2.IsAwake()) {
            body2.ApplyForce(f.SelfMul(-1), p2);
          }
        }
      }
    }
  }
  private static Step_s_f = new b2Vec2();

  public Draw(draw: b2Draw) { }
}

// #endif
