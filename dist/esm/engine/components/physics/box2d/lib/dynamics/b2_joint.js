/*
* Copyright (c) 2006-2007 Erin Catto http://www.box2d.org
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
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
import { b2Maybe, b2_pi } from "../common/b2_settings.js"
import { b2Vec2 } from "../common/b2_math.js"
import { b2Color } from "../common/b2_draw.js"
export var b2JointType;
(function (b2JointType) {
    b2JointType[b2JointType["e_unknownJoint"] = 0] = "e_unknownJoint";
    b2JointType[b2JointType["e_revoluteJoint"] = 1] = "e_revoluteJoint";
    b2JointType[b2JointType["e_prismaticJoint"] = 2] = "e_prismaticJoint";
    b2JointType[b2JointType["e_distanceJoint"] = 3] = "e_distanceJoint";
    b2JointType[b2JointType["e_pulleyJoint"] = 4] = "e_pulleyJoint";
    b2JointType[b2JointType["e_mouseJoint"] = 5] = "e_mouseJoint";
    b2JointType[b2JointType["e_gearJoint"] = 6] = "e_gearJoint";
    b2JointType[b2JointType["e_wheelJoint"] = 7] = "e_wheelJoint";
    b2JointType[b2JointType["e_weldJoint"] = 8] = "e_weldJoint";
    b2JointType[b2JointType["e_frictionJoint"] = 9] = "e_frictionJoint";
    b2JointType[b2JointType["e_ropeJoint"] = 10] = "e_ropeJoint";
    b2JointType[b2JointType["e_motorJoint"] = 11] = "e_motorJoint";
    b2JointType[b2JointType["e_areaJoint"] = 12] = "e_areaJoint";
})(b2JointType || (b2JointType = {}));
export class b2Jacobian {
    linear = new b2Vec2();
    angularA = 0;
    angularB = 0;
    SetZero() {
        this.linear.SetZero();
        this.angularA = 0;
        this.angularB = 0;
        return this;
    }
    Set(x, a1, a2) {
        this.linear.Copy(x);
        this.angularA = a1;
        this.angularB = a2;
        return this;
    }
}
/// A joint edge is used to connect bodies and joints together
/// in a joint graph where each body is a node and each joint
/// is an edge. A joint edge belongs to a doubly linked list
/// maintained in each attached body. Each joint has two joint
/// nodes, one for each attached body.
export class b2JointEdge {
    joint; ///< the joint
    prev = null; ///< the previous joint edge in the body's joint list
    next = null; ///< the next joint edge in the body's joint list
    constructor(joint) {
        this.joint = joint;
    }
    _other = null; ///< provides quick access to the other body attached.
    get other() {
        if (this._other === null) {
            throw new Error();
        }
        return this._other;
    }
    set other(value) {
        if (this._other !== null) {
            throw new Error();
        }
        this._other = value;
    }
    Reset() {
        this._other = null;
        this.prev = null;
        this.next = null;
    }
}
/// Joint definitions are used to construct joints.
export class b2JointDef {
    /// The joint type is set automatically for concrete joint types.
    type = b2JointType.e_unknownJoint;
    /// Use this to attach application specific data to your joints.
    userData = null;
    /// The first attached body.
    bodyA;
    /// The second attached body.
    bodyB;
    /// Set this flag to true if the attached bodies should collide.
    collideConnected = false;
    constructor(type) {
        this.type = type;
    }
}
/// Utility to compute linear stiffness values from frequency and damping ratio
// void b2LinearStiffness(float& stiffness, float& damping,
// 	float frequencyHertz, float dampingRatio,
// 	const b2Body* bodyA, const b2Body* bodyB);
export function b2LinearStiffness(def, frequencyHertz, dampingRatio, bodyA, bodyB) {
    const massA = bodyA.GetMass();
    const massB = bodyB.GetMass();
    let mass;
    if (massA > 0.0 && massB > 0.0) {
        mass = massA * massB / (massA + massB);
    }
    else if (massA > 0.0) {
        mass = massA;
    }
    else {
        mass = massB;
    }
    const omega = 2.0 * b2_pi * frequencyHertz;
    def.stiffness = mass * omega * omega;
    def.damping = 2.0 * mass * dampingRatio * omega;
}
/// Utility to compute rotational stiffness values frequency and damping ratio
// void b2AngularStiffness(float& stiffness, float& damping,
// 	float frequencyHertz, float dampingRatio,
// 	const b2Body* bodyA, const b2Body* bodyB);
export function b2AngularStiffness(def, frequencyHertz, dampingRatio, bodyA, bodyB) {
    const IA = bodyA.GetInertia();
    const IB = bodyB.GetInertia();
    let I;
    if (IA > 0.0 && IB > 0.0) {
        I = IA * IB / (IA + IB);
    }
    else if (IA > 0.0) {
        I = IA;
    }
    else {
        I = IB;
    }
    const omega = 2.0 * b2_pi * frequencyHertz;
    def.stiffness = I * omega * omega;
    def.damping = 2.0 * I * dampingRatio * omega;
}
/// The base joint class. Joints are used to constraint two bodies together in
/// various fashions. Some joints also feature limits and motors.
export class b2Joint {
    /// Debug draw this joint
    static Draw_s_p1 = new b2Vec2();
    static Draw_s_p2 = new b2Vec2();
    static Draw_s_color = new b2Color(0.5, 0.8, 0.8);
    static Draw_s_c = new b2Color();
    m_type = b2JointType.e_unknownJoint;
    m_prev = null;
    m_next = null;
    m_edgeA = new b2JointEdge(this);
    m_edgeB = new b2JointEdge(this);
    m_bodyA;
    m_bodyB;
    m_index = 0;
    m_islandFlag = false;
    m_collideConnected = false;
    m_userData = null;
    constructor(def) {
        // DEBUG: b2Assert(def.bodyA !== def.bodyB);
        this.m_type = def.type;
        this.m_edgeA.other = def.bodyB;
        this.m_edgeB.other = def.bodyA;
        this.m_bodyA = def.bodyA;
        this.m_bodyB = def.bodyB;
        this.m_collideConnected = b2Maybe(def.collideConnected, false);
        this.m_userData = b2Maybe(def.userData, null);
    }
    /// Get the type of the concrete joint.
    GetType() {
        return this.m_type;
    }
    /// Get the first body attached to this joint.
    GetBodyA() {
        return this.m_bodyA;
    }
    /// Get the second body attached to this joint.
    GetBodyB() {
        return this.m_bodyB;
    }
    /// Get collide connected.
    /// Note: modifying the collide connect flag won't work correctly because
    /// Get the next joint the world joint list.
    GetNext() {
        return this.m_next;
    }
    /// Get the user data pointer.
    GetUserData() {
        return this.m_userData;
    }
    /// Set the user data pointer.
    SetUserData(data) {
        this.m_userData = data;
    }
    /// Short-cut function to determine if either body is inactive.
    IsEnabled() {
        return this.m_bodyA.IsEnabled() && this.m_bodyB.IsEnabled();
    }
    /// the flag is only checked when fixture AABBs begin to overlap.
    GetCollideConnected() {
        return this.m_collideConnected;
    }
    /// Dump this joint to the log file.
    Dump(log) {
        log("// Dump is not supported for this joint type.\n");
    }
    /// Shift the origin for any points stored in world coordinates.
    ShiftOrigin(newOrigin) {
    }
    Draw(draw) {
        const xf1 = this.m_bodyA.GetTransform();
        const xf2 = this.m_bodyB.GetTransform();
        const x1 = xf1.p;
        const x2 = xf2.p;
        const p1 = this.GetAnchorA(b2Joint.Draw_s_p1);
        const p2 = this.GetAnchorB(b2Joint.Draw_s_p2);
        const color = b2Joint.Draw_s_color.SetRGB(0.5, 0.8, 0.8);
        switch (this.m_type) {
            case b2JointType.e_distanceJoint:
                draw.DrawSegment(p1, p2, color);
                break;
            case b2JointType.e_pulleyJoint:
                {
                    const pulley = this;
                    const s1 = pulley.GetGroundAnchorA();
                    const s2 = pulley.GetGroundAnchorB();
                    draw.DrawSegment(s1, p1, color);
                    draw.DrawSegment(s2, p2, color);
                    draw.DrawSegment(s1, s2, color);
                }
                break;
            case b2JointType.e_mouseJoint:
                {
                    const c = b2Joint.Draw_s_c;
                    c.Set(0.0, 1.0, 0.0);
                    draw.DrawPoint(p1, 4.0, c);
                    draw.DrawPoint(p2, 4.0, c);
                    c.Set(0.8, 0.8, 0.8);
                    draw.DrawSegment(p1, p2, c);
                }
                break;
            default:
                draw.DrawSegment(x1, p1, color);
                draw.DrawSegment(p1, p2, color);
                draw.DrawSegment(x2, p2, color);
        }
    }
}
