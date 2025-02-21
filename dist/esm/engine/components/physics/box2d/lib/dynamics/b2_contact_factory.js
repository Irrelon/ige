// DEBUG: import { b2Assert } from "../common/b2_settings.js"
import { b2ShapeType } from "../collision/b2_shape.js"
import { b2CircleContact } from "./b2_circle_contact.js"
import { b2PolygonContact } from "./b2_polygon_contact.js"
import { b2PolygonAndCircleContact } from "./b2_polygon_circle_contact.js"
import { b2EdgeAndCircleContact } from "./b2_edge_circle_contact.js"
import { b2EdgeAndPolygonContact } from "./b2_edge_polygon_contact.js"
import { b2ChainAndCircleContact } from "./b2_chain_circle_contact.js"
import { b2ChainAndPolygonContact } from "./b2_chain_polygon_contact.js"
export class b2ContactRegister {
    pool = [];
    createFcn = null;
    destroyFcn = null;
    primary = false;
}
export class b2ContactFactory {
    m_registers = [];
    constructor() {
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
        for (let i = 0; i < b2ShapeType.e_shapeTypeCount; i++) {
            this.m_registers[i] = [];
            for (let j = 0; j < b2ShapeType.e_shapeTypeCount; j++) {
                this.m_registers[i][j] = new b2ContactRegister();
            }
        }
        this.AddType(b2CircleContact.Create, b2CircleContact.Destroy, b2ShapeType.e_circleShape, b2ShapeType.e_circleShape);
        this.AddType(b2PolygonAndCircleContact.Create, b2PolygonAndCircleContact.Destroy, b2ShapeType.e_polygonShape, b2ShapeType.e_circleShape);
        this.AddType(b2PolygonContact.Create, b2PolygonContact.Destroy, b2ShapeType.e_polygonShape, b2ShapeType.e_polygonShape);
        this.AddType(b2EdgeAndCircleContact.Create, b2EdgeAndCircleContact.Destroy, b2ShapeType.e_edgeShape, b2ShapeType.e_circleShape);
        this.AddType(b2EdgeAndPolygonContact.Create, b2EdgeAndPolygonContact.Destroy, b2ShapeType.e_edgeShape, b2ShapeType.e_polygonShape);
        this.AddType(b2ChainAndCircleContact.Create, b2ChainAndCircleContact.Destroy, b2ShapeType.e_chainShape, b2ShapeType.e_circleShape);
        this.AddType(b2ChainAndPolygonContact.Create, b2ChainAndPolygonContact.Destroy, b2ShapeType.e_chainShape, b2ShapeType.e_polygonShape);
    }
}
