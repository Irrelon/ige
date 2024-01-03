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

/// @file
/// Settings that can be overriden for your application
///

// Tunable Constants

/// You can use this to change the length scale used by your game.
/// For example for inches you could use 39.4.
// export const b2_lengthUnitsPerMeter: number = 1.0;

/// The maximum number of vertices on a convex polygon. You cannot increase
/// this too much because b2BlockAllocator has a maximum object size.
// export const b2_maxPolygonVertices: number = 8;

// Memory Allocation

/// Implement this function to use your own memory allocator.
export function b2Alloc(size: number): any {
  return null;
}

/// If you implement b2Alloc, you should also implement this function.
export function b2Free(mem: any): void {
}

/// Logging function.
export function b2Log(message: string, ...args: any[]): void {
  // console.log(message, ...args);
}

export * from "./b2_common.js";
