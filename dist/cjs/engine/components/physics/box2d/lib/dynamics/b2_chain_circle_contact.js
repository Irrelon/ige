"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2ChainAndCircleContact = void 0;
const b2_collide_edge_1 = require("../collision/b2_collide_edge");
const b2_edge_shape_1 = require("../collision/b2_edge_shape");
const b2_contact_1 = require("./b2_contact");
class b2ChainAndCircleContact extends b2_contact_1.b2Contact {
    static Create() {
        return new b2ChainAndCircleContact();
    }
    static Destroy(contact) {
    }
    Evaluate(manifold, xfA, xfB) {
        const edge = b2ChainAndCircleContact.Evaluate_s_edge;
        this.GetShapeA().GetChildEdge(edge, this.m_indexA);
        (0, b2_collide_edge_1.b2CollideEdgeAndCircle)(manifold, edge, xfA, this.GetShapeB(), xfB);
    }
}
exports.b2ChainAndCircleContact = b2ChainAndCircleContact;
b2ChainAndCircleContact.Evaluate_s_edge = new b2_edge_shape_1.b2EdgeShape();
