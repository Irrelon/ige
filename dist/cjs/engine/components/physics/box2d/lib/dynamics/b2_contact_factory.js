"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2ContactFactory = exports.b2ContactRegister = void 0;
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
const b2_shape_1 = require("../collision/b2_shape");
const b2_circle_contact_1 = require("./b2_circle_contact");
const b2_polygon_contact_1 = require("./b2_polygon_contact");
const b2_polygon_circle_contact_1 = require("./b2_polygon_circle_contact");
const b2_edge_circle_contact_1 = require("./b2_edge_circle_contact");
const b2_edge_polygon_contact_1 = require("./b2_edge_polygon_contact");
const b2_chain_circle_contact_1 = require("./b2_chain_circle_contact");
const b2_chain_polygon_contact_1 = require("./b2_chain_polygon_contact");
class b2ContactRegister {
    constructor() {
        this.pool = [];
        this.createFcn = null;
        this.destroyFcn = null;
        this.primary = false;
    }
}
exports.b2ContactRegister = b2ContactRegister;
class b2ContactFactory {
    constructor() {
        this.m_registers = [];
        this.InitializeRegisters();
    }
    Create(fixtureA, indexA, fixtureB, indexB) {
        const typeA = fixtureA.GetType();
        const typeB = fixtureB.GetType();
        // DEBUG: b2Assert(0 <= typeA && typeA < b2ShapeType.e_shapeTypeCount);
        // DEBUG: b2Assert(0 <= typeB && typeB < b2ShapeType.e_shapeTypeCount);
        const reg = this.m_registers[typeA][typeB];
        if (reg.createFcn) {
            const c = reg.createFcn();
            if (reg.primary) {
                c.Reset(fixtureA, indexA, fixtureB, indexB);
            }
            else {
                c.Reset(fixtureB, indexB, fixtureA, indexA);
            }
            return c;
        }
        else {
            return null;
        }
    }
    Destroy(contact) {
        const typeA = contact.m_fixtureA.GetType();
        const typeB = contact.m_fixtureB.GetType();
        // DEBUG: b2Assert(0 <= typeA && typeB < b2ShapeType.e_shapeTypeCount);
        // DEBUG: b2Assert(0 <= typeA && typeB < b2ShapeType.e_shapeTypeCount);
        const reg = this.m_registers[typeA][typeB];
        if (reg.destroyFcn) {
            reg.destroyFcn(contact);
        }
    }
    AddType(createFcn, destroyFcn, typeA, typeB) {
        const pool = [];
        function poolCreateFcn() {
            return pool.pop() || createFcn();
        }
        function poolDestroyFcn(contact) {
            pool.push(contact);
        }
        this.m_registers[typeA][typeB].pool = pool;
        this.m_registers[typeA][typeB].createFcn = poolCreateFcn; // createFcn;
        this.m_registers[typeA][typeB].destroyFcn = poolDestroyFcn; // destroyFcn;
        this.m_registers[typeA][typeB].primary = true;
        if (typeA !== typeB) {
            this.m_registers[typeB][typeA].pool = pool;
            this.m_registers[typeB][typeA].createFcn = poolCreateFcn; // createFcn;
            this.m_registers[typeB][typeA].destroyFcn = poolDestroyFcn; // destroyFcn;
            this.m_registers[typeB][typeA].primary = false;
        }
    }
    InitializeRegisters() {
        for (let i = 0; i < b2_shape_1.b2ShapeType.e_shapeTypeCount; i++) {
            this.m_registers[i] = [];
            for (let j = 0; j < b2_shape_1.b2ShapeType.e_shapeTypeCount; j++) {
                this.m_registers[i][j] = new b2ContactRegister();
            }
        }
        this.AddType(b2_circle_contact_1.b2CircleContact.Create, b2_circle_contact_1.b2CircleContact.Destroy, b2_shape_1.b2ShapeType.e_circleShape, b2_shape_1.b2ShapeType.e_circleShape);
        this.AddType(b2_polygon_circle_contact_1.b2PolygonAndCircleContact.Create, b2_polygon_circle_contact_1.b2PolygonAndCircleContact.Destroy, b2_shape_1.b2ShapeType.e_polygonShape, b2_shape_1.b2ShapeType.e_circleShape);
        this.AddType(b2_polygon_contact_1.b2PolygonContact.Create, b2_polygon_contact_1.b2PolygonContact.Destroy, b2_shape_1.b2ShapeType.e_polygonShape, b2_shape_1.b2ShapeType.e_polygonShape);
        this.AddType(b2_edge_circle_contact_1.b2EdgeAndCircleContact.Create, b2_edge_circle_contact_1.b2EdgeAndCircleContact.Destroy, b2_shape_1.b2ShapeType.e_edgeShape, b2_shape_1.b2ShapeType.e_circleShape);
        this.AddType(b2_edge_polygon_contact_1.b2EdgeAndPolygonContact.Create, b2_edge_polygon_contact_1.b2EdgeAndPolygonContact.Destroy, b2_shape_1.b2ShapeType.e_edgeShape, b2_shape_1.b2ShapeType.e_polygonShape);
        this.AddType(b2_chain_circle_contact_1.b2ChainAndCircleContact.Create, b2_chain_circle_contact_1.b2ChainAndCircleContact.Destroy, b2_shape_1.b2ShapeType.e_chainShape, b2_shape_1.b2ShapeType.e_circleShape);
        this.AddType(b2_chain_polygon_contact_1.b2ChainAndPolygonContact.Create, b2_chain_polygon_contact_1.b2ChainAndPolygonContact.Destroy, b2_shape_1.b2ShapeType.e_chainShape, b2_shape_1.b2ShapeType.e_polygonShape);
    }
}
exports.b2ContactFactory = b2ContactFactory;
