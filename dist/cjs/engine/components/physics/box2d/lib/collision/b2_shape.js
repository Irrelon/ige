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
exports.b2Shape = exports.b2ShapeType = exports.b2MassData = void 0;
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
const b2_math_js_1 = require("../common/b2_math.js");
/// This holds the mass data computed for a shape.
class b2MassData {
    constructor() {
        /// The mass of the shape, usually in kilograms.
        this.mass = 0;
        /// The position of the shape's centroid relative to the shape's origin.
        this.center = new b2_math_js_1.b2Vec2(0, 0);
        /// The rotational inertia of the shape about the local origin.
        this.I = 0;
    }
}
exports.b2MassData = b2MassData;
var b2ShapeType;
(function (b2ShapeType) {
    b2ShapeType[b2ShapeType["e_unknown"] = -1] = "e_unknown";
    b2ShapeType[b2ShapeType["e_circleShape"] = 0] = "e_circleShape";
    b2ShapeType[b2ShapeType["e_edgeShape"] = 1] = "e_edgeShape";
    b2ShapeType[b2ShapeType["e_polygonShape"] = 2] = "e_polygonShape";
    b2ShapeType[b2ShapeType["e_chainShape"] = 3] = "e_chainShape";
    b2ShapeType[b2ShapeType["e_shapeTypeCount"] = 4] = "e_shapeTypeCount";
})(b2ShapeType || (exports.b2ShapeType = b2ShapeType = {}));
/// A shape is used for collision detection. You can create a shape however you like.
/// Shapes used for simulation in b2World are created automatically when a b2Fixture
/// is created. Shapes may encapsulate a one or more child shapes.
class b2Shape {
    constructor(type, radius) {
        this.m_type = b2ShapeType.e_unknown;
        /// Radius of a shape. For polygonal shapes this must be b2_polygonRadius. There is no support for
        /// making rounded polygons.
        this.m_radius = 0;
        this.m_type = type;
        this.m_radius = radius;
    }
    Copy(other) {
        // DEBUG: b2Assert(this.m_type === other.m_type);
        this.m_radius = other.m_radius;
        return this;
    }
    /// Get the type of this shape. You can use this to down cast to the concrete shape.
    /// @return the shape type.
    GetType() {
        return this.m_type;
    }
}
exports.b2Shape = b2Shape;
