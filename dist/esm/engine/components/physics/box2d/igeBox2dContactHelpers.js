export function igeBox2dContactEntityA(contact) {
    const ent = contact.m_fixtureA.m_body.m_userData._entity;
    ent._box2dOurContactFixture = contact.m_fixtureA;
    ent._box2dTheirContactFixture = contact.m_fixtureB;
    return ent;
}
export function igeBox2dContactEntityB(contact) {
    const ent = contact.m_fixtureB.m_body.m_userData._entity;
    ent._box2dOurContactFixture = contact.m_fixtureB;
    ent._box2dTheirContactFixture = contact.m_fixtureA;
    return ent;
}
export function igeBox2dContactEitherId(contact, id1, id2) {
    if (!id2) {
        return (contact.m_fixtureA.m_body.m_userData._entity._id === id1 ||
            contact.m_fixtureB.m_body.m_userData._entity._id === id1);
    }
    else {
        return ((contact.m_fixtureA.m_body.m_userData._entity._id === id1 ||
            contact.m_fixtureB.m_body.m_userData._entity._id === id1) &&
            (contact.m_fixtureA.m_body.m_userData._entity._id === id2 ||
                contact.m_fixtureB.m_body.m_userData._entity._id === id2));
    }
}
export function igeBox2dContactEitherCategory(contact, category1, category2) {
    if (!category2) {
        return (contact.m_fixtureA.m_body.m_userData._entity._category === category1 ||
            contact.m_fixtureB.m_body.m_userData._entity._category === category1);
    }
    else {
        return ((contact.m_fixtureA.m_body.m_userData._entity._category === category1 ||
            contact.m_fixtureB.m_body.m_userData._entity._category === category1) &&
            (contact.m_fixtureA.m_body.m_userData._entity._category === category2 ||
                contact.m_fixtureB.m_body.m_userData._entity._category === category2));
    }
}
export function igeBox2dContactBothCategories(contact, category) {
    return (contact.m_fixtureA.m_body.m_userData._entity._category === category &&
        contact.m_fixtureB.m_body.m_userData._entity._category === category);
}
export function igeBox2dContactEntityByCategory(contact, category) {
    if (contact.m_fixtureA.m_body.m_userData._entity._category === category) {
        return igeBox2dContactEntityA(contact);
    }
    if (contact.m_fixtureB.m_body.m_userData._entity._category === category) {
        return igeBox2dContactEntityB(contact);
    }
}
export function igeBox2dContactEntityById(contact, id) {
    if (contact.m_fixtureA.m_body.m_userData._entity._id === id) {
        return igeBox2dContactEntityA(contact);
    }
    if (contact.m_fixtureB.m_body.m_userData._entity._id === id) {
        return igeBox2dContactEntityB(contact);
    }
}
export function igeBox2dContactEntityByFixtureId(contact, id) {
    // @ts-ignore
    if (contact.m_fixtureA.igeId === id) {
        return igeBox2dContactEntityA(contact);
    }
    // @ts-ignore
    if (contact.m_fixtureB.igeId === id) {
        return igeBox2dContactEntityB(contact);
    }
}
export function igeBox2dContactOtherEntity(contact, bodyEntity) {
    if (contact.m_fixtureA.m_body.m_userData._entity === bodyEntity) {
        return igeBox2dContactEntityB(contact);
    }
    else {
        return igeBox2dContactEntityA(contact);
    }
}
