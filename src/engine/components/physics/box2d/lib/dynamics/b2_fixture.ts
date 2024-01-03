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
import { b2Maybe, b2_lengthUnitsPerMeter } from "../common/b2_settings.js";
import { b2Vec2, b2Transform, XY } from "../common/b2_math.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "../collision/b2_collision.js";
import { b2TreeNode } from "../collision/b2_dynamic_tree.js";
import { b2Shape, b2ShapeType, b2MassData } from "../collision/b2_shape.js";
import { b2Body } from "./b2_body.js";

/// This holds contact filtering data.
export interface b2IFilter {
  /// The collision category bits. Normally you would just set one bit.
  categoryBits: number;

  /// The collision mask bits. This states the categories that this
  /// shape would accept for collision.
  maskBits: number;

  /// Collision groups allow a certain group of objects to never collide (negative)
  /// or always collide (positive). Zero means no collision group. Non-zero group
  /// filtering always wins against the mask bits.
  groupIndex?: number;
}

/// This holds contact filtering data.
export class b2Filter implements b2IFilter {
  public static readonly DEFAULT: Readonly<b2Filter> = new b2Filter();

  /// The collision category bits. Normally you would just set one bit.
  public categoryBits: number = 0x0001;

  /// The collision mask bits. This states the categories that this
  /// shape would accept for collision.
  public maskBits: number = 0xFFFF;

  /// Collision groups allow a certain group of objects to never collide (negative)
  /// or always collide (positive). Zero means no collision group. Non-zero group
  /// filtering always wins against the mask bits.
  public groupIndex: number = 0;

  public Clone(): b2Filter {
    return new b2Filter().Copy(this);
  }

  public Copy(other: b2IFilter): this {
    // DEBUG: b2Assert(this !== other);
    this.categoryBits = other.categoryBits;
    this.maskBits = other.maskBits;
    this.groupIndex = other.groupIndex || 0;
    return this;
  }
}

/// A fixture definition is used to create a fixture. This class defines an
/// abstract fixture definition. You can reuse fixture definitions safely.
export interface b2IFixtureDef {
  /// The shape, this must be set. The shape will be cloned, so you
  /// can create the shape on the stack.
  shape: b2Shape;

  /// Use this to store application specific fixture data.
  userData?: any;

  /// The friction coefficient, usually in the range [0,1].
  friction?: number;

  /// The restitution (elasticity) usually in the range [0,1].
  restitution?: number;

  /// Restitution velocity threshold, usually in m/s. Collisions above this
  /// speed have restitution applied (will bounce).
  restitutionThreshold?: number;

  /// The density, usually in kg/m^2.
  density?: number;

  /// A sensor shape collects contact information but never generates a collision
  /// response.
  isSensor?: boolean;

  /// Contact filtering data.
  filter?: b2IFilter;
}

/// A fixture definition is used to create a fixture. This class defines an
/// abstract fixture definition. You can reuse fixture definitions safely.
export class b2FixtureDef implements b2IFixtureDef {
  /// The shape, this must be set. The shape will be cloned, so you
  /// can create the shape on the stack.
  public shape!: b2Shape;

  /// Use this to store application specific fixture data.
  public userData: any = null;

  /// The friction coefficient, usually in the range [0,1].
  public friction: number = 0.2;

  /// The restitution (elasticity) usually in the range [0,1].
  public restitution: number = 0;

  /// Restitution velocity threshold, usually in m/s. Collisions above this
  /// speed have restitution applied (will bounce).
  public restitutionThreshold: number = 1.0 * b2_lengthUnitsPerMeter;

  /// The density, usually in kg/m^2.
  public density: number = 0;

  /// A sensor shape collects contact information but never generates a collision
  /// response.
  public isSensor: boolean = false;

  /// Contact filtering data.
  public readonly filter: b2Filter = new b2Filter();
}

/// This proxy is used internally to connect fixtures to the broad-phase.
export class b2FixtureProxy {
  public readonly aabb: b2AABB = new b2AABB();
  public readonly fixture: b2Fixture;
  public readonly childIndex: number = 0;
  public treeNode: b2TreeNode<b2FixtureProxy>;
  constructor(fixture: b2Fixture, childIndex: number) {
    this.fixture = fixture;
    this.childIndex = childIndex;
    this.fixture.m_shape.ComputeAABB(this.aabb, this.fixture.m_body.GetTransform(), childIndex);
    this.treeNode = this.fixture.m_body.m_world.m_contactManager.m_broadPhase.CreateProxy(this.aabb, this);
  }
  public Reset(): void {
    this.fixture.m_body.m_world.m_contactManager.m_broadPhase.DestroyProxy(this.treeNode);
  }
  public Touch(): void {
    this.fixture.m_body.m_world.m_contactManager.m_broadPhase.TouchProxy(this.treeNode);
  }
  private static Synchronize_s_aabb1 = new b2AABB();
  private static Synchronize_s_aabb2 = new b2AABB();
  private static Synchronize_s_displacement = new b2Vec2();
  public Synchronize(transform1: b2Transform, transform2: b2Transform): void {
    if (transform1 === transform2) {
      this.fixture.m_shape.ComputeAABB(this.aabb, transform1, this.childIndex);
      this.fixture.m_body.m_world.m_contactManager.m_broadPhase.MoveProxy(this.treeNode, this.aabb, b2Vec2.ZERO);
    } else {
      // Compute an AABB that covers the swept shape (may miss some rotation effect).
      const aabb1: b2AABB = b2FixtureProxy.Synchronize_s_aabb1;
      const aabb2: b2AABB = b2FixtureProxy.Synchronize_s_aabb2;
      this.fixture.m_shape.ComputeAABB(aabb1, transform1, this.childIndex);
      this.fixture.m_shape.ComputeAABB(aabb2, transform2, this.childIndex);
      this.aabb.Combine2(aabb1, aabb2);
      const displacement: b2Vec2 = b2FixtureProxy.Synchronize_s_displacement;
      displacement.Copy(aabb2.GetCenter()).SelfSub(aabb1.GetCenter());
      this.fixture.m_body.m_world.m_contactManager.m_broadPhase.MoveProxy(this.treeNode, this.aabb, displacement);
    }
  }
}

/// A fixture is used to attach a shape to a body for collision detection. A fixture
/// inherits its transform from its parent. Fixtures hold additional non-geometric data
/// such as friction, collision filters, etc.
/// Fixtures are created via b2Body::CreateFixture.
/// @warning you cannot reuse fixtures.
export class b2Fixture {
  public m_density: number = 0;

  public m_next: b2Fixture | null = null;
  public readonly m_body: b2Body;

  public readonly m_shape: b2Shape;

  public m_friction: number = 0;
  public m_restitution: number = 0;
  public m_restitutionThreshold: number = 1.0 * b2_lengthUnitsPerMeter;

  public readonly m_proxies: b2FixtureProxy[] = [];
  public get m_proxyCount(): number { return this.m_proxies.length; }

  public readonly m_filter: b2Filter = new b2Filter();

  public m_isSensor: boolean = false;

  public m_userData: any = null;

  constructor(body: b2Body, def: b2IFixtureDef) {
    this.m_body = body;
    this.m_shape = def.shape.Clone();
    this.m_userData = b2Maybe(def.userData, null);
    this.m_friction = b2Maybe(def.friction, 0.2);
    this.m_restitution = b2Maybe(def.restitution, 0);
    this.m_restitutionThreshold = b2Maybe(def.restitutionThreshold, 0);
    this.m_filter.Copy(b2Maybe(def.filter, b2Filter.DEFAULT));
    this.m_isSensor = b2Maybe(def.isSensor, false);
    this.m_density = b2Maybe(def.density, 0);
  }

  public Reset(): void {
    // The proxies must be destroyed before calling this.
    // DEBUG: b2Assert(this.m_proxyCount === 0);
  }

  /// Get the type of the child shape. You can use this to down cast to the concrete shape.
  /// @return the shape type.
  public GetType(): b2ShapeType {
    return this.m_shape.GetType();
  }

  /// Get the child shape. You can modify the child shape, however you should not change the
  /// number of vertices because this will crash some collision caching mechanisms.
  /// Manipulating the shape may lead to non-physical behavior.
  public GetShape(): b2Shape {
    return this.m_shape;
  }

  /// Set if this fixture is a sensor.
  public SetSensor(sensor: boolean): void {
    if (sensor !== this.m_isSensor) {
      this.m_body.SetAwake(true);
      this.m_isSensor = sensor;
    }
  }

  /// Is this fixture a sensor (non-solid)?
  /// @return the true if the shape is a sensor.
  public IsSensor(): boolean {
    return this.m_isSensor;
  }

  /// Set the contact filtering data. This will not update contacts until the next time
  /// step when either parent body is active and awake.
  /// This automatically calls Refilter.
  public SetFilterData(filter: b2Filter): void {
    this.m_filter.Copy(filter);

    this.Refilter();
  }

  /// Get the contact filtering data.
  public GetFilterData(): Readonly<b2Filter> {
    return this.m_filter;
  }

  /// Call this if you want to establish collision that was previously disabled by b2ContactFilter::ShouldCollide.
  public Refilter(): void {
    // Flag associated contacts for filtering.
    let edge = this.m_body.GetContactList();

    while (edge) {
      const contact = edge.contact;
      const fixtureA = contact.GetFixtureA();
      const fixtureB = contact.GetFixtureB();
      if (fixtureA === this || fixtureB === this) {
        contact.FlagForFiltering();
      }

      edge = edge.next;
    }

    // Touch each proxy so that new pairs may be created
    this.TouchProxies();
  }

  /// Get the parent body of this fixture. This is NULL if the fixture is not attached.
  /// @return the parent body.
  public GetBody(): b2Body {
    return this.m_body;
  }

  /// Get the next fixture in the parent body's fixture list.
  /// @return the next shape.
  public GetNext(): b2Fixture | null {
    return this.m_next;
  }

  /// Get the user data that was assigned in the fixture definition. Use this to
  /// store your application specific data.
  public GetUserData(): any {
    return this.m_userData;
  }

  /// Set the user data. Use this to store your application specific data.
  public SetUserData(data: any): void {
    this.m_userData = data;
  }

  /// Test a point for containment in this fixture.
  /// @param p a point in world coordinates.
  public TestPoint(p: XY): boolean {
    return this.m_shape.TestPoint(this.m_body.GetTransform(), p);
  }

  // #if B2_ENABLE_PARTICLE
  public ComputeDistance(p: b2Vec2, normal: b2Vec2, childIndex: number): number {
    return this.m_shape.ComputeDistance(this.m_body.GetTransform(), p, normal, childIndex);
  }
  // #endif

  /// Cast a ray against this shape.
  /// @param output the ray-cast results.
  /// @param input the ray-cast input parameters.
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, childIndex: number): boolean {
    return this.m_shape.RayCast(output, input, this.m_body.GetTransform(), childIndex);
  }

  /// Get the mass data for this fixture. The mass data is based on the density and
  /// the shape. The rotational inertia is about the shape's origin. This operation
  /// may be expensive.
  public GetMassData(massData: b2MassData = new b2MassData()): b2MassData {
    this.m_shape.ComputeMass(massData, this.m_density);

    return massData;
  }

  /// Set the density of this fixture. This will _not_ automatically adjust the mass
  /// of the body. You must call b2Body::ResetMassData to update the body's mass.
  public SetDensity(density: number): void {
    this.m_density = density;
  }

  /// Get the density of this fixture.
  public GetDensity(): number {
    return this.m_density;
  }

  /// Get the coefficient of friction.
  public GetFriction(): number {
    return this.m_friction;
  }

  /// Set the coefficient of friction. This will _not_ change the friction of
  /// existing contacts.
  public SetFriction(friction: number): void {
    this.m_friction = friction;
  }

  /// Get the coefficient of restitution.
  public GetRestitution(): number {
    return this.m_restitution;
  }

  /// Set the coefficient of restitution. This will _not_ change the restitution of
  /// existing contacts.
  public SetRestitution(restitution: number): void {
    this.m_restitution = restitution;
  }

	/// Get the restitution velocity threshold.
	public GetRestitutionThreshold(): number {
    return this.m_restitutionThreshold;
  }

	/// Set the restitution threshold. This will _not_ change the restitution threshold of
	/// existing contacts.
	public SetRestitutionThreshold(threshold: number): void {
    this.m_restitutionThreshold = threshold;
  }

  /// Get the fixture's AABB. This AABB may be enlarge and/or stale.
  /// If you need a more accurate AABB, compute it using the shape and
  /// the body transform.
  public GetAABB(childIndex: number): Readonly<b2AABB> {
    // DEBUG: b2Assert(0 <= childIndex && childIndex < this.m_proxyCount);
    return this.m_proxies[childIndex].aabb;
  }

  /// Dump this fixture to the log file.
  public Dump(log: (format: string, ...args: any[]) => void, bodyIndex: number): void {
    log("    const fd: b2FixtureDef = new b2FixtureDef();\n");
    log("    fd.friction = %.15f;\n", this.m_friction);
    log("    fd.restitution = %.15f;\n", this.m_restitution);
    log("    fd.restitutionThreshold = %.15f;\n", this.m_restitutionThreshold);
    log("    fd.density = %.15f;\n", this.m_density);
    log("    fd.isSensor = %s;\n", (this.m_isSensor) ? ("true") : ("false"));
    log("    fd.filter.categoryBits = %d;\n", this.m_filter.categoryBits);
    log("    fd.filter.maskBits = %d;\n", this.m_filter.maskBits);
    log("    fd.filter.groupIndex = %d;\n", this.m_filter.groupIndex);

    this.m_shape.Dump(log);

    log("\n");
    log("    fd.shape = shape;\n");
    log("\n");
    log("    bodies[%d].CreateFixture(fd);\n", bodyIndex);
  }

  // These support body activation/deactivation.
  public CreateProxies(): void {
    if (this.m_proxies.length !== 0) { throw new Error(); }
    // Create proxies in the broad-phase.
    for (let i: number = 0; i < this.m_shape.GetChildCount(); ++i) {
      this.m_proxies[i] = new b2FixtureProxy(this, i);
    }
  }

  public DestroyProxies(): void {
    // Destroy proxies in the broad-phase.
    for (const proxy of this.m_proxies) {
      proxy.Reset();
    }
    this.m_proxies.length = 0;
  }

  public TouchProxies(): void {
    for (const proxy of this.m_proxies) {
      proxy.Touch();
    }
  }

  public SynchronizeProxies(transform1: b2Transform, transform2: b2Transform): void {
    for (const proxy of this.m_proxies) {
      proxy.Synchronize(transform1, transform2);
    }
  }
}
