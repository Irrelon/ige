import type { b2Contact } from "./b2_contact.js"
import type { b2Fixture } from "./b2_fixture.js"
export declare class b2ContactRegister {
    pool: b2Contact[];
    createFcn: (() => b2Contact) | null;
    destroyFcn: ((contact: b2Contact) => void) | null;
    primary: boolean;
}
export declare class b2ContactFactory {
    readonly m_registers: b2ContactRegister[][];
    constructor();
    Create(fixtureA: b2Fixture, indexA: number, fixtureB: b2Fixture, indexB: number): b2Contact | null;
    Destroy(contact: b2Contact): void;
    private AddType;
    private InitializeRegisters;
}
