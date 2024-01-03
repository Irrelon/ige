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

// DEBUG: import { b2Assert } from "../common/b2_settings.js";
import { b2_maxFloat, b2_timeToSleep } from "../common/b2_settings.js";
import { b2_maxTranslation, b2_maxTranslationSquared } from "../common/b2_settings.js";
import { b2_maxRotation, b2_maxRotationSquared } from "../common/b2_settings.js";
import { b2_linearSleepTolerance, b2_angularSleepTolerance } from "../common/b2_settings.js";
import { b2Abs, b2Min, b2Max, b2Vec2 } from "../common/b2_math.js";
import { b2Timer } from "../common/b2_timer.js";
import { b2Contact } from "./b2_contact.js";
import { b2ContactSolver, b2ContactSolverDef } from "./b2_contact_solver.js";
import { b2ContactVelocityConstraint } from "./b2_contact_solver.js";
import { b2Joint } from "./b2_joint.js";
import { b2Body, b2BodyType } from "./b2_body.js";
import { b2TimeStep, b2Profile, b2SolverData, b2Position, b2Velocity } from "./b2_time_step.js";
import { b2ContactImpulse, b2ContactListener } from "./b2_world_callbacks.js";

/*
Position Correction Notes
=========================
I tried the several algorithms for position correction of the 2D revolute joint.
I looked at these systems:
- simple pendulum (1m diameter sphere on massless 5m stick) with initial angular velocity of 100 rad/s.
- suspension bridge with 30 1m long planks of length 1m.
- multi-link chain with 30 1m long links.

Here are the algorithms:

Baumgarte - A fraction of the position error is added to the velocity error. There is no
separate position solver.

Pseudo Velocities - After the velocity solver and position integration,
the position error, Jacobian, and effective mass are recomputed. Then
the velocity constraints are solved with pseudo velocities and a fraction
of the position error is added to the pseudo velocity error. The pseudo
velocities are initialized to zero and there is no warm-starting. After
the position solver, the pseudo velocities are added to the positions.
This is also called the First Order World method or the Position LCP method.

Modified Nonlinear Gauss-Seidel (NGS) - Like Pseudo Velocities except the
position error is re-computed for each constraint and the positions are updated
after the constraint is solved. The radius vectors (aka Jacobians) are
re-computed too (otherwise the algorithm has horrible instability). The pseudo
velocity states are not needed because they are effectively zero at the beginning
of each iteration. Since we have the current position error, we allow the
iterations to terminate early if the error becomes smaller than b2_linearSlop.

Full NGS or just NGS - Like Modified NGS except the effective mass are re-computed
each time a constraint is solved.

Here are the results:
Baumgarte - this is the cheapest algorithm but it has some stability problems,
especially with the bridge. The chain links separate easily close to the root
and they jitter as they struggle to pull together. This is one of the most common
methods in the field. The big drawback is that the position correction artificially
affects the momentum, thus leading to instabilities and false bounce. I used a
bias factor of 0.2. A larger bias factor makes the bridge less stable, a smaller
factor makes joints and contacts more spongy.

Pseudo Velocities - the is more stable than the Baumgarte method. The bridge is
stable. However, joints still separate with large angular velocities. Drag the
simple pendulum in a circle quickly and the joint will separate. The chain separates
easily and does not recover. I used a bias factor of 0.2. A larger value lead to
the bridge collapsing when a heavy cube drops on it.

Modified NGS - this algorithm is better in some ways than Baumgarte and Pseudo
Velocities, but in other ways it is worse. The bridge and chain are much more
stable, but the simple pendulum goes unstable at high angular velocities.

Full NGS - stable in all tests. The joints display good stiffness. The bridge
still sags, but this is better than infinite forces.

Recommendations
Pseudo Velocities are not really worthwhile because the bridge and chain cannot
recover from joint separation. In other cases the benefit over Baumgarte is small.

Modified NGS is not a robust method for the revolute joint due to the violent
instability seen in the simple pendulum. Perhaps it is viable with other constraint
types, especially scalar constraints where the effective mass is a scalar.

This leaves Baumgarte and Full NGS. Baumgarte has small, but manageable instabilities
and is very fast. I don't think we can escape Baumgarte, especially in highly
demanding cases where high constraint fidelity is not needed.

Full NGS is robust and easy on the eyes. I recommend this as an option for
higher fidelity simulation and certainly for suspension bridges and long chains.
Full NGS might be a good choice for ragdolls, especially motorized ragdolls where
joint separation can be problematic. The number of NGS iterations can be reduced
for better performance without harming robustness much.

Each joint in a can be handled differently in the position solver. So I recommend
a system where the user can select the algorithm on a per joint basis. I would
probably default to the slower Full NGS and let the user select the faster
Baumgarte method in performance critical scenarios.
*/

/*
Cache Performance

The Box2D solvers are dominated by cache misses. Data structures are designed
to increase the number of cache hits. Much of misses are due to random access
to body data. The constraint structures are iterated over linearly, which leads
to few cache misses.

The bodies are not accessed during iteration. Instead read only data, such as
the mass values are stored with the constraints. The mutable data are the constraint
impulses and the bodies velocities/positions. The impulses are held inside the
constraint structures. The body velocities/positions are held in compact, temporary
arrays to increase the number of cache hits. Linear and angular velocity are
stored in a single array since multiple arrays lead to multiple misses.
*/

/*
2D Rotation

R = [cos(theta) -sin(theta)]
    [sin(theta) cos(theta) ]

thetaDot = omega

Let q1 = cos(theta), q2 = sin(theta).
R = [q1 -q2]
    [q2  q1]

q1Dot = -thetaDot * q2
q2Dot = thetaDot * q1

q1_new = q1_old - dt * w * q2
q2_new = q2_old + dt * w * q1
then normalize.

This might be faster than computing sin+cos.
However, we can compute sin+cos of the same angle fast.
*/

export class b2Island {
  public m_listener!: b2ContactListener;

  public readonly m_bodies: b2Body[] = [/*1024*/]; // TODO: b2Settings
  public readonly m_contacts: b2Contact[] = [/*1024*/]; // TODO: b2Settings
  public readonly m_joints: b2Joint[] = [/*1024*/]; // TODO: b2Settings

  public readonly m_positions: b2Position[] = b2Position.MakeArray(1024); // TODO: b2Settings
  public readonly m_velocities: b2Velocity[] = b2Velocity.MakeArray(1024); // TODO: b2Settings

  public m_bodyCount: number = 0;
  public m_jointCount: number = 0;
  public m_contactCount: number = 0;

  public m_bodyCapacity: number = 0;
  public m_contactCapacity: number = 0;
  public m_jointCapacity: number = 0;

  public Initialize(bodyCapacity: number, contactCapacity: number, jointCapacity: number, listener: b2ContactListener): void {
    this.m_bodyCapacity = bodyCapacity;
    this.m_contactCapacity = contactCapacity;
    this.m_jointCapacity = jointCapacity;
    this.m_bodyCount = 0;
    this.m_contactCount = 0;
    this.m_jointCount = 0;

    this.m_listener = listener;

    // TODO:
    // while (this.m_bodies.length < bodyCapacity) {
    //   this.m_bodies[this.m_bodies.length] = null;
    // }
    // TODO:
    // while (this.m_contacts.length < contactCapacity) {
    //   this.m_contacts[this.m_contacts.length] = null;
    // }
    // TODO:
    // while (this.m_joints.length < jointCapacity) {
    //   this.m_joints[this.m_joints.length] = null;
    // }

    // TODO:
    if (this.m_positions.length < bodyCapacity) {
      const new_length = b2Max(this.m_positions.length * 2, bodyCapacity);
      while (this.m_positions.length < new_length) {
        this.m_positions[this.m_positions.length] = new b2Position();
      }
    }
    // TODO:
    if (this.m_velocities.length < bodyCapacity) {
      const new_length = b2Max(this.m_velocities.length * 2, bodyCapacity);
      while (this.m_velocities.length < new_length) {
        this.m_velocities[this.m_velocities.length] = new b2Velocity();
      }
    }
  }

  public Clear(): void {
    this.m_bodyCount = 0;
    this.m_contactCount = 0;
    this.m_jointCount = 0;
  }

  public AddBody(body: b2Body): void {
    // DEBUG: b2Assert(this.m_bodyCount < this.m_bodyCapacity);
    body.m_islandIndex = this.m_bodyCount;
    this.m_bodies[this.m_bodyCount++] = body;
  }

  public AddContact(contact: b2Contact): void {
    // DEBUG: b2Assert(this.m_contactCount < this.m_contactCapacity);
    this.m_contacts[this.m_contactCount++] = contact;
  }

  public AddJoint(joint: b2Joint): void {
    // DEBUG: b2Assert(this.m_jointCount < this.m_jointCapacity);
    this.m_joints[this.m_jointCount++] = joint;
  }

  private static s_timer = new b2Timer();
  private static s_solverData = new b2SolverData();
  private static s_contactSolverDef = new b2ContactSolverDef();
  private static s_contactSolver = new b2ContactSolver();
  private static s_translation = new b2Vec2();
  public Solve(profile: b2Profile, step: b2TimeStep, gravity: b2Vec2, allowSleep: boolean): void {
    const timer: b2Timer = b2Island.s_timer.Reset();

    const h: number = step.dt;

    // Integrate velocities and apply damping. Initialize the body state.
    for (let i: number = 0; i < this.m_bodyCount; ++i) {
      const b: b2Body = this.m_bodies[i];

      // const c: b2Vec2 =
      this.m_positions[i].c.Copy(b.m_sweep.c);
      const a: number = b.m_sweep.a;
      const v: b2Vec2 = this.m_velocities[i].v.Copy(b.m_linearVelocity);
      let w: number = b.m_angularVelocity;

      // Store positions for continuous collision.
      b.m_sweep.c0.Copy(b.m_sweep.c);
      b.m_sweep.a0 = b.m_sweep.a;

      if (b.m_type === b2BodyType.b2_dynamicBody) {
        // Integrate velocities.
        // v += h * b->m_invMass * (b->m_gravityScale * b->m_mass * gravity + b->m_force);
        v.x += h * b.m_invMass * (b.m_gravityScale * b.m_mass * gravity.x + b.m_force.x);
        v.y += h * b.m_invMass * (b.m_gravityScale * b.m_mass * gravity.y + b.m_force.y);
        w += h * b.m_invI * b.m_torque;

        // Apply damping.
        // ODE: dv/dt + c * v = 0
        // Solution: v(t) = v0 * exp(-c * t)
        // Time step: v(t + dt) = v0 * exp(-c * (t + dt)) = v0 * exp(-c * t) * exp(-c * dt) = v * exp(-c * dt)
        // v2 = exp(-c * dt) * v1
        // Pade approximation:
        // v2 = v1 * 1 / (1 + c * dt)
        v.SelfMul(1.0 / (1.0 + h * b.m_linearDamping));
        w *= 1.0 / (1.0 + h * b.m_angularDamping);
      }

      // this.m_positions[i].c = c;
      this.m_positions[i].a = a;
      // this.m_velocities[i].v = v;
      this.m_velocities[i].w = w;
    }

    timer.Reset();

    // Solver data
    const solverData: b2SolverData = b2Island.s_solverData;
    solverData.step.Copy(step);
    solverData.positions = this.m_positions;
    solverData.velocities = this.m_velocities;

    // Initialize velocity constraints.
    const contactSolverDef: b2ContactSolverDef = b2Island.s_contactSolverDef;
    contactSolverDef.step.Copy(step);
    contactSolverDef.contacts = this.m_contacts;
    contactSolverDef.count = this.m_contactCount;
    contactSolverDef.positions = this.m_positions;
    contactSolverDef.velocities = this.m_velocities;

    const contactSolver: b2ContactSolver = b2Island.s_contactSolver.Initialize(contactSolverDef);
    contactSolver.InitializeVelocityConstraints();

    if (step.warmStarting) {
      contactSolver.WarmStart();
    }

    for (let i: number = 0; i < this.m_jointCount; ++i) {
      this.m_joints[i].InitVelocityConstraints(solverData);
    }

    profile.solveInit = timer.GetMilliseconds();

    // Solve velocity constraints.
    timer.Reset();
    for (let i: number = 0; i < step.velocityIterations; ++i) {
      for (let j: number = 0; j < this.m_jointCount; ++j) {
        this.m_joints[j].SolveVelocityConstraints(solverData);
      }

      contactSolver.SolveVelocityConstraints();
    }

    // Store impulses for warm starting
    contactSolver.StoreImpulses();
    profile.solveVelocity = timer.GetMilliseconds();

    // Integrate positions.
    for (let i: number = 0; i < this.m_bodyCount; ++i) {
      const c: b2Vec2 = this.m_positions[i].c;
      let a: number = this.m_positions[i].a;
      const v: b2Vec2 = this.m_velocities[i].v;
      let w: number = this.m_velocities[i].w;

      // Check for large velocities
      const translation: b2Vec2 = b2Vec2.MulSV(h, v, b2Island.s_translation);
      if (b2Vec2.DotVV(translation, translation) > b2_maxTranslationSquared) {
        const ratio: number = b2_maxTranslation / translation.Length();
        v.SelfMul(ratio);
      }

      const rotation: number = h * w;
      if (rotation * rotation > b2_maxRotationSquared) {
        const ratio: number = b2_maxRotation / b2Abs(rotation);
        w *= ratio;
      }

      // Integrate
      c.x += h * v.x;
      c.y += h * v.y;
      a += h * w;

      // this.m_positions[i].c = c;
      this.m_positions[i].a = a;
      // this.m_velocities[i].v = v;
      this.m_velocities[i].w = w;
    }

    // Solve position constraints
    timer.Reset();
    let positionSolved: boolean = false;
    for (let i: number = 0; i < step.positionIterations; ++i) {
      const contactsOkay: boolean = contactSolver.SolvePositionConstraints();

      let jointsOkay: boolean = true;
      for (let j: number = 0; j < this.m_jointCount; ++j) {
        const jointOkay: boolean = this.m_joints[j].SolvePositionConstraints(solverData);
        jointsOkay = jointsOkay && jointOkay;
      }

      if (contactsOkay && jointsOkay) {
        // Exit early if the position errors are small.
        positionSolved = true;
        break;
      }
    }

    // Copy state buffers back to the bodies
    for (let i: number = 0; i < this.m_bodyCount; ++i) {
      const body: b2Body = this.m_bodies[i];
      body.m_sweep.c.Copy(this.m_positions[i].c);
      body.m_sweep.a = this.m_positions[i].a;
      body.m_linearVelocity.Copy(this.m_velocities[i].v);
      body.m_angularVelocity = this.m_velocities[i].w;
      body.SynchronizeTransform();
    }

    profile.solvePosition = timer.GetMilliseconds();

    this.Report(contactSolver.m_velocityConstraints);

    if (allowSleep) {
      let minSleepTime: number = b2_maxFloat;

      const linTolSqr: number = b2_linearSleepTolerance * b2_linearSleepTolerance;
      const angTolSqr: number = b2_angularSleepTolerance * b2_angularSleepTolerance;

      for (let i: number = 0; i < this.m_bodyCount; ++i) {
        const b: b2Body = this.m_bodies[i];
        if (b.GetType() === b2BodyType.b2_staticBody) {
          continue;
        }

        if (!b.m_autoSleepFlag ||
          b.m_angularVelocity * b.m_angularVelocity > angTolSqr ||
          b2Vec2.DotVV(b.m_linearVelocity, b.m_linearVelocity) > linTolSqr) {
          b.m_sleepTime = 0;
          minSleepTime = 0;
        } else {
          b.m_sleepTime += h;
          minSleepTime = b2Min(minSleepTime, b.m_sleepTime);
        }
      }

      if (minSleepTime >= b2_timeToSleep && positionSolved) {
        for (let i: number = 0; i < this.m_bodyCount; ++i) {
          const b: b2Body = this.m_bodies[i];
          b.SetAwake(false);
        }
      }
    }
  }

  public SolveTOI(subStep: b2TimeStep, toiIndexA: number, toiIndexB: number): void {
    // DEBUG: b2Assert(toiIndexA < this.m_bodyCount);
    // DEBUG: b2Assert(toiIndexB < this.m_bodyCount);

    // Initialize the body state.
    for (let i: number = 0; i < this.m_bodyCount; ++i) {
      const b: b2Body = this.m_bodies[i];
      this.m_positions[i].c.Copy(b.m_sweep.c);
      this.m_positions[i].a = b.m_sweep.a;
      this.m_velocities[i].v.Copy(b.m_linearVelocity);
      this.m_velocities[i].w = b.m_angularVelocity;
    }

    const contactSolverDef: b2ContactSolverDef = b2Island.s_contactSolverDef;
    contactSolverDef.contacts = this.m_contacts;
    contactSolverDef.count = this.m_contactCount;
    contactSolverDef.step.Copy(subStep);
    contactSolverDef.positions = this.m_positions;
    contactSolverDef.velocities = this.m_velocities;
    const contactSolver: b2ContactSolver = b2Island.s_contactSolver.Initialize(contactSolverDef);

    // Solve position constraints.
    for (let i: number = 0; i < subStep.positionIterations; ++i) {
      const contactsOkay: boolean = contactSolver.SolveTOIPositionConstraints(toiIndexA, toiIndexB);
      if (contactsOkay) {
        break;
      }
    }

  /*
  #if 0
    // Is the new position really safe?
    for (int32 i = 0; i < this.m_contactCount; ++i) {
      b2Contact* c = this.m_contacts[i];
      b2Fixture* fA = c.GetFixtureA();
      b2Fixture* fB = c.GetFixtureB();

      b2Body* bA = fA.GetBody();
      b2Body* bB = fB.GetBody();

      int32 indexA = c.GetChildIndexA();
      int32 indexB = c.GetChildIndexB();

      b2DistanceInput input;
      input.proxyA.Set(fA.GetShape(), indexA);
      input.proxyB.Set(fB.GetShape(), indexB);
      input.transformA = bA.GetTransform();
      input.transformB = bB.GetTransform();
      input.useRadii = false;

      b2DistanceOutput output;
      b2SimplexCache cache;
      cache.count = 0;
      b2Distance(&output, &cache, &input);

      if (output.distance === 0 || cache.count === 3) {
        cache.count += 0;
      }
    }
  #endif
  */

    // Leap of faith to new safe state.
    this.m_bodies[toiIndexA].m_sweep.c0.Copy(this.m_positions[toiIndexA].c);
    this.m_bodies[toiIndexA].m_sweep.a0 = this.m_positions[toiIndexA].a;
    this.m_bodies[toiIndexB].m_sweep.c0.Copy(this.m_positions[toiIndexB].c);
    this.m_bodies[toiIndexB].m_sweep.a0 = this.m_positions[toiIndexB].a;

    // No warm starting is needed for TOI events because warm
    // starting impulses were applied in the discrete solver.
    contactSolver.InitializeVelocityConstraints();

    // Solve velocity constraints.
    for (let i: number = 0; i < subStep.velocityIterations; ++i) {
      contactSolver.SolveVelocityConstraints();
    }

    // Don't store the TOI contact forces for warm starting
    // because they can be quite large.

    const h: number = subStep.dt;

    // Integrate positions
    for (let i: number = 0; i < this.m_bodyCount; ++i) {
      const c: b2Vec2 = this.m_positions[i].c;
      let a: number = this.m_positions[i].a;
      const v: b2Vec2 = this.m_velocities[i].v;
      let w: number = this.m_velocities[i].w;

      // Check for large velocities
      const translation: b2Vec2 = b2Vec2.MulSV(h, v, b2Island.s_translation);
      if (b2Vec2.DotVV(translation, translation) > b2_maxTranslationSquared) {
        const ratio: number = b2_maxTranslation / translation.Length();
        v.SelfMul(ratio);
      }

      const rotation: number = h * w;
      if (rotation * rotation > b2_maxRotationSquared) {
        const ratio: number = b2_maxRotation / b2Abs(rotation);
        w *= ratio;
      }

      // Integrate
      c.SelfMulAdd(h, v);
      a += h * w;

      // this.m_positions[i].c = c;
      this.m_positions[i].a = a;
      // this.m_velocities[i].v = v;
      this.m_velocities[i].w = w;

      // Sync bodies
      const body: b2Body = this.m_bodies[i];
      body.m_sweep.c.Copy(c);
      body.m_sweep.a = a;
      body.m_linearVelocity.Copy(v);
      body.m_angularVelocity = w;
      body.SynchronizeTransform();
    }

    this.Report(contactSolver.m_velocityConstraints);
  }

  private static s_impulse = new b2ContactImpulse();
  public Report(constraints: b2ContactVelocityConstraint[]): void {
    if (this.m_listener === null) {
      return;
    }

    for (let i: number = 0; i < this.m_contactCount; ++i) {
      const c: b2Contact = this.m_contacts[i];

      if (!c) { continue; }

      const vc: b2ContactVelocityConstraint = constraints[i];

      const impulse: b2ContactImpulse = b2Island.s_impulse;
      impulse.count = vc.pointCount;
      for (let j: number = 0; j < vc.pointCount; ++j) {
        impulse.normalImpulses[j] = vc.points[j].normalImpulse;
        impulse.tangentImpulses[j] = vc.points[j].tangentImpulse;
      }

      this.m_listener.PostSolve(c, impulse);
    }
  }
}
