import { IgeEntityBox2d } from "./IgeEntityBox2d.js"
import { b2Contact } from "./lib/dynamics/b2_contact.js"
export declare function igeBox2dContactEntityA(contact: b2Contact): any;
export declare function igeBox2dContactEntityB(contact: b2Contact): any;
export declare function igeBox2dContactEitherId(contact: b2Contact, id1: string, id2: string): boolean;
export declare function igeBox2dContactEitherCategory(contact: b2Contact, category1: string, category2: string): boolean;
export declare function igeBox2dContactBothCategories(contact: b2Contact, category: string): boolean;
export declare function igeBox2dContactEntityByCategory(contact: b2Contact, category: string): IgeEntityBox2d | undefined;
export declare function igeBox2dContactEntityById(contact: b2Contact, id: string): IgeEntityBox2d | undefined;
export declare function igeBox2dContactEntityByFixtureId(contact: b2Contact, id: string): IgeEntityBox2d | undefined;
export declare function igeBox2dContactOtherEntity(contact: b2Contact, bodyEntity: IgeEntityBox2d): IgeEntityBox2d | undefined;
