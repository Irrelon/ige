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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * \mainpage Box2D API Documentation
 * \section intro_sec Getting Started
 * For documentation please see http://box2d.org/documentation.html
 * For discussion please visit http://box2d.org/forum
 */
// These include files constitute the main Box2D API
__exportStar(require("./common/b2_settings.js"), exports);
__exportStar(require("./common/b2_math.js"), exports);
__exportStar(require("./common/b2_draw.js"), exports);
__exportStar(require("./common/b2_timer.js"), exports);
__exportStar(require("./common/b2_growable_stack.js"), exports);
__exportStar(require("./common/b2_block_allocator.js"), exports);
__exportStar(require("./common/b2_stack_allocator.js"), exports);
__exportStar(require("./collision/b2_collision.js"), exports);
__exportStar(require("./collision/b2_distance.js"), exports);
__exportStar(require("./collision/b2_broad_phase.js"), exports);
__exportStar(require("./collision/b2_dynamic_tree.js"), exports);
__exportStar(require("./collision/b2_time_of_impact.js"), exports);
__exportStar(require("./collision/b2_collide_circle.js"), exports);
__exportStar(require("./collision/b2_collide_polygon.js"), exports);
__exportStar(require("./collision/b2_collide_edge.js"), exports);
__exportStar(require("./collision/b2_shape.js"), exports);
__exportStar(require("./collision/b2_circle_shape.js"), exports);
__exportStar(require("./collision/b2_polygon_shape.js"), exports);
__exportStar(require("./collision/b2_edge_shape.js"), exports);
__exportStar(require("./collision/b2_chain_shape.js"), exports);
__exportStar(require("./dynamics/b2_fixture.js"), exports);
__exportStar(require("./dynamics/b2_body.js"), exports);
__exportStar(require("./dynamics/b2_world.js"), exports);
__exportStar(require("./dynamics/b2_world_callbacks.js"), exports);
__exportStar(require("./dynamics/b2_island.js"), exports);
__exportStar(require("./dynamics/b2_time_step.js"), exports);
__exportStar(require("./dynamics/b2_contact_manager.js"), exports);
__exportStar(require("./dynamics/b2_contact.js"), exports);
__exportStar(require("./dynamics/b2_contact_factory.js"), exports);
__exportStar(require("./dynamics/b2_contact_solver.js"), exports);
__exportStar(require("./dynamics/b2_circle_contact.js"), exports);
__exportStar(require("./dynamics/b2_polygon_contact.js"), exports);
__exportStar(require("./dynamics/b2_polygon_circle_contact.js"), exports);
__exportStar(require("./dynamics/b2_edge_circle_contact.js"), exports);
__exportStar(require("./dynamics/b2_edge_polygon_contact.js"), exports);
__exportStar(require("./dynamics/b2_chain_circle_contact.js"), exports);
__exportStar(require("./dynamics/b2_chain_polygon_contact.js"), exports);
__exportStar(require("./dynamics/b2_joint.js"), exports);
__exportStar(require("./dynamics/b2_area_joint.js"), exports);
__exportStar(require("./dynamics/b2_distance_joint.js"), exports);
__exportStar(require("./dynamics/b2_friction_joint.js"), exports);
__exportStar(require("./dynamics/b2_gear_joint.js"), exports);
__exportStar(require("./dynamics/b2_motor_joint.js"), exports);
__exportStar(require("./dynamics/b2_mouse_joint.js"), exports);
__exportStar(require("./dynamics/b2_prismatic_joint.js"), exports);
__exportStar(require("./dynamics/b2_pulley_joint.js"), exports);
__exportStar(require("./dynamics/b2_revolute_joint.js"), exports);
__exportStar(require("./dynamics/b2_weld_joint.js"), exports);
__exportStar(require("./dynamics/b2_wheel_joint.js"), exports);
// #if B2_ENABLE_CONTROLLER
__exportStar(require("./controllers/b2_controller.js"), exports);
__exportStar(require("./controllers/b2_buoyancy_controller.js"), exports);
__exportStar(require("./controllers/b2_constant_accel_controller.js"), exports);
__exportStar(require("./controllers/b2_constant_force_controller.js"), exports);
__exportStar(require("./controllers/b2_gravity_controller.js"), exports);
__exportStar(require("./controllers/b2_tensor_damping_controller.js"), exports);
// #endif
// #if B2_ENABLE_PARTICLE
__exportStar(require("./particle/b2_particle.js"), exports);
__exportStar(require("./particle/b2_particle_group.js"), exports);
__exportStar(require("./particle/b2_particle_system.js"), exports);
// #endif
__exportStar(require("./rope/b2_rope.js"), exports);
