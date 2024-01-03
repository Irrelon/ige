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
import { b2BroadPhase } from "../collision/b2_broad_phase.js";
import { b2TreeNode } from "../collision/b2_dynamic_tree.js";
import { b2TestOverlapAABB } from "../collision/b2_collision.js";
import { b2Contact, b2ContactEdge } from "./b2_contact.js";
import { b2ContactFactory } from "./b2_contact_factory.js";
import { b2Body, b2BodyType } from "./b2_body.js";
import { b2Fixture, b2FixtureProxy } from "./b2_fixture.js";
import { b2ContactFilter, b2ContactListener } from "./b2_world_callbacks.js";

// Delegate of b2World.
export class b2ContactManager {
  public readonly m_broadPhase: b2BroadPhase<b2FixtureProxy> = new b2BroadPhase<b2FixtureProxy>();
  public m_contactList: b2Contact | null = null;
  public m_contactCount: number = 0;
  public m_contactFilter: b2ContactFilter = b2ContactFilter.b2_defaultFilter;
  public m_contactListener: b2ContactListener = b2ContactListener.b2_defaultListener;

  public readonly m_contactFactory: b2ContactFactory = new b2ContactFactory();

  // Broad-phase callback.
  public AddPair(proxyA: b2FixtureProxy, proxyB: b2FixtureProxy): void {
    // DEBUG: b2Assert(proxyA instanceof b2FixtureProxy);
    // DEBUG: b2Assert(proxyB instanceof b2FixtureProxy);

    let fixtureA: b2Fixture = proxyA.fixture;
    let fixtureB: b2Fixture = proxyB.fixture;

    let indexA: number = proxyA.childIndex;
    let indexB: number = proxyB.childIndex;

    let bodyA: b2Body = fixtureA.GetBody();
    let bodyB: b2Body = fixtureB.GetBody();

    // Are the fixtures on the same body?
    if (bodyA === bodyB) {
      return;
    }

    // TODO_ERIN use a hash table to remove a potential bottleneck when both
    // bodies have a lot of contacts.
    // Does a contact already exist?
    let edge: b2ContactEdge | null = bodyB.GetContactList();
    while (edge) {
      if (edge.other === bodyA) {
        const fA: b2Fixture = edge.contact.GetFixtureA();
        const fB: b2Fixture = edge.contact.GetFixtureB();
        const iA: number = edge.contact.GetChildIndexA();
        const iB: number = edge.contact.GetChildIndexB();

        if (fA === fixtureA && fB === fixtureB && iA === indexA && iB === indexB) {
          // A contact already exists.
          return;
        }

        if (fA === fixtureB && fB === fixtureA && iA === indexB && iB === indexA) {
          // A contact already exists.
          return;
        }
      }

      edge = edge.next;
    }

    // Check user filtering.
    if (this.m_contactFilter && !this.m_contactFilter.ShouldCollide(fixtureA, fixtureB)) {
      return;
    }

    // Call the factory.
    const c: b2Contact | null = this.m_contactFactory.Create(fixtureA, indexA, fixtureB, indexB);
    if (c === null) {
      return;
    }

    // Contact creation may swap fixtures.
    fixtureA = c.GetFixtureA();
    fixtureB = c.GetFixtureB();
    indexA = c.GetChildIndexA();
    indexB = c.GetChildIndexB();
    bodyA = fixtureA.m_body;
    bodyB = fixtureB.m_body;

    // Insert into the world.
    c.m_prev = null;
    c.m_next = this.m_contactList;
    if (this.m_contactList !== null) {
      this.m_contactList.m_prev = c;
    }
    this.m_contactList = c;

    // Connect to island graph.

    // Connect to body A
    c.m_nodeA.other = bodyB;

    c.m_nodeA.prev = null;
    c.m_nodeA.next = bodyA.m_contactList;
    if (bodyA.m_contactList !== null) {
      bodyA.m_contactList.prev = c.m_nodeA;
    }
    bodyA.m_contactList = c.m_nodeA;

    // Connect to body B
    c.m_nodeB.other = bodyA;

    c.m_nodeB.prev = null;
    c.m_nodeB.next = bodyB.m_contactList;
    if (bodyB.m_contactList !== null) {
      bodyB.m_contactList.prev = c.m_nodeB;
    }
    bodyB.m_contactList = c.m_nodeB;

    ++this.m_contactCount;
  }

  public FindNewContacts(): void {
    this.m_broadPhase.UpdatePairs((proxyA: b2FixtureProxy, proxyB: b2FixtureProxy): void => {
      this.AddPair(proxyA, proxyB);
    });
  }

  public Destroy(c: b2Contact): void {
    const fixtureA: b2Fixture = c.GetFixtureA();
    const fixtureB: b2Fixture = c.GetFixtureB();
    const bodyA: b2Body = fixtureA.GetBody();
    const bodyB: b2Body = fixtureB.GetBody();

    if (this.m_contactListener && c.IsTouching()) {
      this.m_contactListener.EndContact(c);
    }

    // Remove from the world.
    if (c.m_prev) {
      c.m_prev.m_next = c.m_next;
    }

    if (c.m_next) {
      c.m_next.m_prev = c.m_prev;
    }

    if (c === this.m_contactList) {
      this.m_contactList = c.m_next;
    }

    // Remove from body 1
    if (c.m_nodeA.prev) {
      c.m_nodeA.prev.next = c.m_nodeA.next;
    }

    if (c.m_nodeA.next) {
      c.m_nodeA.next.prev = c.m_nodeA.prev;
    }

    if (c.m_nodeA === bodyA.m_contactList) {
      bodyA.m_contactList = c.m_nodeA.next;
    }

    // Remove from body 2
    if (c.m_nodeB.prev) {
      c.m_nodeB.prev.next = c.m_nodeB.next;
    }

    if (c.m_nodeB.next) {
      c.m_nodeB.next.prev = c.m_nodeB.prev;
    }

    if (c.m_nodeB === bodyB.m_contactList) {
      bodyB.m_contactList = c.m_nodeB.next;
    }

    // moved this from b2ContactFactory:Destroy
    if (c.m_manifold.pointCount > 0 &&
      !fixtureA.IsSensor() &&
      !fixtureB.IsSensor()) {
      fixtureA.GetBody().SetAwake(true);
      fixtureB.GetBody().SetAwake(true);
    }

    // Call the factory.
    this.m_contactFactory.Destroy(c);
    --this.m_contactCount;
  }

  // This is the top level collision call for the time step. Here
  // all the narrow phase collision is processed for the world
  // contact list.
  public Collide(): void {
    // Update awake contacts.
    let c: b2Contact | null = this.m_contactList;
    while (c) {
      const fixtureA: b2Fixture = c.GetFixtureA();
      const fixtureB: b2Fixture = c.GetFixtureB();
      const indexA: number = c.GetChildIndexA();
      const indexB: number = c.GetChildIndexB();
      const bodyA: b2Body = fixtureA.GetBody();
      const bodyB: b2Body = fixtureB.GetBody();

      // Is this contact flagged for filtering?
      if (c.m_filterFlag) {
        // Check user filtering.
        if (this.m_contactFilter && !this.m_contactFilter.ShouldCollide(fixtureA, fixtureB)) {
          const cNuke: b2Contact = c;
          c = cNuke.m_next;
          this.Destroy(cNuke);
          continue;
        }

        // Clear the filtering flag.
        c.m_filterFlag = false;
      }

      const activeA: boolean = bodyA.IsAwake() && bodyA.m_type !== b2BodyType.b2_staticBody;
      const activeB: boolean = bodyB.IsAwake() && bodyB.m_type !== b2BodyType.b2_staticBody;

      // At least one body must be awake and it must be dynamic or kinematic.
      if (!activeA && !activeB) {
        c = c.m_next;
        continue;
      }

      const treeNodeA: b2TreeNode<b2FixtureProxy> = fixtureA.m_proxies[indexA].treeNode;
      const treeNodeB: b2TreeNode<b2FixtureProxy> = fixtureB.m_proxies[indexB].treeNode;
      const overlap: boolean = b2TestOverlapAABB(treeNodeA.aabb, treeNodeB.aabb);

      // Here we destroy contacts that cease to overlap in the broad-phase.
      if (!overlap) {
        const cNuke: b2Contact = c;
        c = cNuke.m_next;
        this.Destroy(cNuke);
        continue;
      }

      // The contact persists.
      c.Update(this.m_contactListener);
      c = c.m_next;
    }
  }
}
