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

import type { b2Transform } from "../common/b2_math";
import { b2CollidePolygonAndCircle } from "../collision/b2_collide_circle";
import type { b2Manifold } from "../collision/b2_collision";
import type { b2CircleShape } from "../collision/b2_circle_shape";
import type { b2PolygonShape } from "../collision/b2_polygon_shape";
import { b2Contact } from "./b2_contact";

export class b2PolygonAndCircleContact extends b2Contact<b2PolygonShape, b2CircleShape> {
	public static Create (): b2Contact {
		return new b2PolygonAndCircleContact();
	}

	public static Destroy (contact: b2Contact): void {
	}

	public Evaluate (manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void {
		b2CollidePolygonAndCircle(manifold, this.GetShapeA(), xfA, this.GetShapeB(), xfB);
	}
}
