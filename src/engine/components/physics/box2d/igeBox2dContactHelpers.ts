import type { IgeEntityBox2d } from "@/export/exports";
import type { b2Contact } from "@/export/exports";

export function igeBox2dContactEntityA (contact: b2Contact) {
	const ent = contact.m_fixtureA.m_body.m_userData._entity;
	ent._box2dOurContactFixture = contact.m_fixtureA;
	ent._box2dTheirContactFixture = contact.m_fixtureB;
	return ent;
}

export function igeBox2dContactEntityB (contact: b2Contact) {
	const ent = contact.m_fixtureB.m_body.m_userData._entity;
	ent._box2dOurContactFixture = contact.m_fixtureB;
	ent._box2dTheirContactFixture = contact.m_fixtureA;
	return ent;
}

export function igeBox2dContactEitherId (contact: b2Contact, id1: string, id2: string): boolean {
	if (!id2) {
		return (
			contact.m_fixtureA.m_body.m_userData._entity._id === id1 ||
			contact.m_fixtureB.m_body.m_userData._entity._id === id1
		);
	} else {
		return (
			(contact.m_fixtureA.m_body.m_userData._entity._id === id1 ||
				contact.m_fixtureB.m_body.m_userData._entity._id === id1) &&
			(contact.m_fixtureA.m_body.m_userData._entity._id === id2 ||
				contact.m_fixtureB.m_body.m_userData._entity._id === id2)
		);
	}
}

export function igeBox2dContactEitherCategory (contact: b2Contact, category1: string, category2: string): boolean {
	if (!category2) {
		return (
			contact.m_fixtureA.m_body.m_userData._entity._category === category1 ||
			contact.m_fixtureB.m_body.m_userData._entity._category === category1
		);
	} else {
		return (
			(contact.m_fixtureA.m_body.m_userData._entity._category === category1 ||
				contact.m_fixtureB.m_body.m_userData._entity._category === category1) &&
			(contact.m_fixtureA.m_body.m_userData._entity._category === category2 ||
				contact.m_fixtureB.m_body.m_userData._entity._category === category2)
		);
	}
}

export function igeBox2dContactBothCategories (contact: b2Contact, category: string): boolean {
	return (
		contact.m_fixtureA.m_body.m_userData._entity._category === category &&
		contact.m_fixtureB.m_body.m_userData._entity._category === category
	);
}

export function igeBox2dContactEntityByCategory (contact: b2Contact, category: string): IgeEntityBox2d | undefined {
	if (contact.m_fixtureA.m_body.m_userData._entity._category === category) {
		return igeBox2dContactEntityA(contact);
	}

	if (contact.m_fixtureB.m_body.m_userData._entity._category === category) {
		return igeBox2dContactEntityB(contact);
	}
}

export function igeBox2dContactEntityById (contact: b2Contact, id: string): IgeEntityBox2d | undefined {
	if (contact.m_fixtureA.m_body.m_userData._entity._id === id) {
		return igeBox2dContactEntityA(contact);
	}

	if (contact.m_fixtureB.m_body.m_userData._entity._id === id) {
		return igeBox2dContactEntityB(contact);
	}
}

export function igeBox2dContactEntityByFixtureId (contact: b2Contact, id: string): IgeEntityBox2d | undefined {
	// @ts-ignore
	if (contact.m_fixtureA.igeId === id) {
		return igeBox2dContactEntityA(contact);
	}
	// @ts-ignore
	if (contact.m_fixtureB.igeId === id) {
		return igeBox2dContactEntityB(contact);
	}
}

export function igeBox2dContactOtherEntity (contact: b2Contact, bodyEntity: IgeEntityBox2d): IgeEntityBox2d | undefined {
	if (contact.m_fixtureA.m_body.m_userData._entity === bodyEntity) {
		return igeBox2dContactEntityB(contact);
	} else {
		return igeBox2dContactEntityA(contact);
	}
}
