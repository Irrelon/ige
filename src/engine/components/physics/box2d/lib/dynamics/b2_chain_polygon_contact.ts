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

import { b2Transform } from "../common/b2_math.js";
import { b2CollideEdgeAndPolygon } from "../collision/b2_collide_edge.js";
import { b2Manifold } from "../collision/b2_collision.js";
import { b2ChainShape } from "../collision/b2_chain_shape.js";
import { b2EdgeShape } from "../collision/b2_edge_shape.js";
import { b2PolygonShape } from "../collision/b2_polygon_shape.js";
import { b2Contact } from "./b2_contact.js";

export class b2ChainAndPolygonContact extends b2Contact<b2ChainShape, b2PolygonShape> {
  public static Create(): b2Contact {
    return new b2ChainAndPolygonContact();
  }

  public static Destroy(contact: b2Contact): void {
  }

  private static Evaluate_s_edge = new b2EdgeShape();
  public Evaluate(manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void {
    const edge: b2EdgeShape = b2ChainAndPolygonContact.Evaluate_s_edge;
    this.GetShapeA().GetChildEdge(edge, this.m_indexA);
    b2CollideEdgeAndPolygon(manifold, edge, xfA, this.GetShapeB(), xfB);
  }
}
