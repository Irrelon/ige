"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeBox2dContactOtherEntity = exports.igeBox2dContactEntityByFixtureId = exports.igeBox2dContactEntityById = exports.igeBox2dContactEntityByCategory = exports.igeBox2dContactBothCategories = exports.igeBox2dContactEitherCategory = exports.igeBox2dContactEitherId = exports.igeBox2dContactEntityB = exports.igeBox2dContactEntityA = void 0;
function igeBox2dContactEntityA(contact) {
    const ent = contact.m_fixtureA.m_body.m_userData._entity;
    ent._box2dOurContactFixture = contact.m_fixtureA;
    ent._box2dTheirContactFixture = contact.m_fixtureB;
    return ent;
}
exports.igeBox2dContactEntityA = igeBox2dContactEntityA;
function igeBox2dContactEntityB(contact) {
    const ent = contact.m_fixtureB.m_body.m_userData._entity;
    ent._box2dOurContactFixture = contact.m_fixtureB;
    ent._box2dTheirContactFixture = contact.m_fixtureA;
    return ent;
}
exports.igeBox2dContactEntityB = igeBox2dContactEntityB;
function igeBox2dContactEitherId(contact, id1, id2) {
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
exports.igeBox2dContactEitherId = igeBox2dContactEitherId;
function igeBox2dContactEitherCategory(contact, category1, category2) {
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
exports.igeBox2dContactEitherCategory = igeBox2dContactEitherCategory;
function igeBox2dContactBothCategories(contact, category) {
    return (contact.m_fixtureA.m_body.m_userData._entity._category === category &&
        contact.m_fixtureB.m_body.m_userData._entity._category === category);
}
exports.igeBox2dContactBothCategories = igeBox2dContactBothCategories;
function igeBox2dContactEntityByCategory(contact, category) {
    if (contact.m_fixtureA.m_body.m_userData._entity._category === category) {
        return igeBox2dContactEntityA(contact);
    }
    if (contact.m_fixtureB.m_body.m_userData._entity._category === category) {
        return igeBox2dContactEntityB(contact);
    }
}
exports.igeBox2dContactEntityByCategory = igeBox2dContactEntityByCategory;
function igeBox2dContactEntityById(contact, id) {
    if (contact.m_fixtureA.m_body.m_userData._entity._id === id) {
        return igeBox2dContactEntityA(contact);
    }
    if (contact.m_fixtureB.m_body.m_userData._entity._id === id) {
        return igeBox2dContactEntityB(contact);
    }
}
exports.igeBox2dContactEntityById = igeBox2dContactEntityById;
function igeBox2dContactEntityByFixtureId(contact, id) {
    // @ts-ignore
    if (contact.m_fixtureA.igeId === id) {
        return igeBox2dContactEntityA(contact);
    }
    // @ts-ignore
    if (contact.m_fixtureB.igeId === id) {
        return igeBox2dContactEntityB(contact);
    }
}
exports.igeBox2dContactEntityByFixtureId = igeBox2dContactEntityByFixtureId;
function igeBox2dContactOtherEntity(contact, bodyEntity) {
    if (contact.m_fixtureA.m_body.m_userData._entity === bodyEntity) {
        return igeBox2dContactEntityB(contact);
    }
    else {
        return igeBox2dContactEntityA(contact);
    }
}
exports.igeBox2dContactOtherEntity = igeBox2dContactOtherEntity;
