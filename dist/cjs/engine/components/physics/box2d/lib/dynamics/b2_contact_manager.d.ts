import { b2BroadPhase } from "../collision/b2_broad_phase.js"
import type { b2Contact } from "./b2_contact.js"
import { b2ContactFactory } from "./b2_contact_factory.js"
import type { b2FixtureProxy } from "./b2_fixture.js"
import { b2ContactFilter, b2ContactListener } from "./b2_world_callbacks.js"
export declare class b2ContactManager {
    readonly m_broadPhase: b2BroadPhase<b2FixtureProxy>;
    m_contactList: b2Contact | null;
    m_contactCount: number;
    m_contactFilter: b2ContactFilter;
    m_contactListener: b2ContactListener;
    readonly m_contactFactory: b2ContactFactory;
    AddPair(proxyA: b2FixtureProxy, proxyB: b2FixtureProxy): void;
    FindNewContacts(): void;
    Destroy(c: b2Contact): void;
    Collide(): void;
}
