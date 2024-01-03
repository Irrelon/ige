/*
* Copyright (c) 2006-2010 Erin Catto http://www.box2d.org
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

// DEBUG: import { b2Assert, b2_linearSlop } from "../common/b2_settings.js";
import { b2_polygonRadius } from "../common/b2_settings.js";
import { b2Vec2, b2Transform, XY } from "../common/b2_math.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js";
import { b2DistanceProxy } from "./b2_distance.js";
import { b2MassData } from "./b2_shape.js";
import { b2Shape, b2ShapeType } from "./b2_shape.js";
import { b2EdgeShape } from "./b2_edge_shape.js";

/// A chain shape is a free form sequence of line segments.
/// The chain has one-sided collision, with the surface normal pointing to the right of the edge.
/// This provides a counter-clockwise winding like the polygon shape.
/// Connectivity information is used to create smooth collisions.
/// @warning the chain will not collide properly if there are self-intersections.
export class b2ChainShape extends b2Shape {
  public m_vertices: b2Vec2[] = [];
  public m_count: number = 0;
  public readonly m_prevVertex: b2Vec2 = new b2Vec2();
  public readonly m_nextVertex: b2Vec2 = new b2Vec2();

  constructor() {
    super(b2ShapeType.e_chainShape, b2_polygonRadius);
  }

  /// Create a loop. This automatically adjusts connectivity.
  /// @param vertices an array of vertices, these are copied
  /// @param count the vertex count
  public CreateLoop(vertices: XY[]): this;
  public CreateLoop(vertices: number[]): this;
  public CreateLoop(...args: any[]): this {
    if (typeof args[0][0] === "number") {
      const vertices: number[] = args[0];
      if (vertices.length % 2 !== 0) { throw new Error(); }
      return this._CreateLoop((index: number): XY => ({ x: vertices[index * 2], y: vertices[index * 2 + 1] }), vertices.length / 2);
    } else {
      const vertices: XY[] = args[0];
      return this._CreateLoop((index: number): XY => vertices[index], vertices.length);
    }
  }
  private _CreateLoop(vertices: (index: number) => XY, count: number): this {
    // DEBUG: b2Assert(count >= 3);
    if (count < 3) {
      return this;
    }
    // DEBUG: for (let i: number = 1; i < count; ++i) {
    // DEBUG:   const v1 = vertices[start + i - 1];
    // DEBUG:   const v2 = vertices[start + i];
    // DEBUG:   // If the code crashes here, it means your vertices are too close together.
    // DEBUG:   b2Assert(b2Vec2.DistanceSquaredVV(v1, v2) > b2_linearSlop * b2_linearSlop);
    // DEBUG: }

    this.m_count = count + 1;
    this.m_vertices = b2Vec2.MakeArray(this.m_count);
    for (let i: number = 0; i < count; ++i) {
      this.m_vertices[i].Copy(vertices(i));
    }
    this.m_vertices[count].Copy(this.m_vertices[0]);
    this.m_prevVertex.Copy(this.m_vertices[this.m_count - 2]);
    this.m_nextVertex.Copy(this.m_vertices[1]);
    return this;
  }

	/// Create a chain with ghost vertices to connect multiple chains together.
	/// @param vertices an array of vertices, these are copied
	/// @param count the vertex count
	/// @param prevVertex previous vertex from chain that connects to the start
	/// @param nextVertex next vertex from chain that connects to the end
  public CreateChain(vertices: XY[], prevVertex: Readonly<XY>, nextVertex: Readonly<XY>): this;
  public CreateChain(vertices: number[], prevVertex: Readonly<XY>, nextVertex: Readonly<XY>): this;
  public CreateChain(...args: any[]): this {
    if (typeof args[0][0] === "number") {
      const vertices: number[] = args[0];
      const prevVertex: Readonly<XY> = args[1];
      const nextVertex: Readonly<XY> = args[2];
      if (vertices.length % 2 !== 0) { throw new Error(); }
      return this._CreateChain((index: number): XY => ({ x: vertices[index * 2], y: vertices[index * 2 + 1] }), vertices.length / 2, prevVertex, nextVertex);
    } else {
      const vertices: XY[] = args[0];
      const prevVertex: Readonly<XY> = args[1];
      const nextVertex: Readonly<XY> = args[2];
      return this._CreateChain((index: number): XY => vertices[index], vertices.length, prevVertex, nextVertex);
    }
  }
  private _CreateChain(vertices: (index: number) => XY, count: number, prevVertex: Readonly<XY>, nextVertex: Readonly<XY>): this {
    // DEBUG: b2Assert(count >= 2);
    // DEBUG: for (let i: number = 1; i < count; ++i) {
    // DEBUG:   const v1 = vertices[start + i - 1];
    // DEBUG:   const v2 = vertices[start + i];
    // DEBUG:   // If the code crashes here, it means your vertices are too close together.
    // DEBUG:   b2Assert(b2Vec2.DistanceSquaredVV(v1, v2) > b2_linearSlop * b2_linearSlop);
    // DEBUG: }

    this.m_count = count;
    this.m_vertices = b2Vec2.MakeArray(count);
    for (let i: number = 0; i < count; ++i) {
      this.m_vertices[i].Copy(vertices(i));
    }

    this.m_prevVertex.Copy(prevVertex);
    this.m_nextVertex.Copy(nextVertex);

    return this;
  }

  /// Implement b2Shape. Vertices are cloned using b2Alloc.
  public Clone(): b2ChainShape {
    return new b2ChainShape().Copy(this);
  }

  public override Copy(other: b2ChainShape): this {
    super.Copy(other);

    // DEBUG: b2Assert(other instanceof b2ChainShape);

    this._CreateChain((index: number): XY => other.m_vertices[index], other.m_count, other.m_prevVertex, other.m_nextVertex);
    this.m_prevVertex.Copy(other.m_prevVertex);
    this.m_nextVertex.Copy(other.m_nextVertex);

    return this;
  }

  /// @see b2Shape::GetChildCount
  public GetChildCount(): number {
    // edge count = vertex count - 1
    return this.m_count - 1;
  }

  /// Get a child edge.
  public GetChildEdge(edge: b2EdgeShape, index: number): void {
    // DEBUG: b2Assert(0 <= index && index < this.m_count - 1);
    edge.m_radius = this.m_radius;

    edge.m_vertex1.Copy(this.m_vertices[index]);
    edge.m_vertex2.Copy(this.m_vertices[index + 1]);
    edge.m_oneSided = true;

    if (index > 0) {
      edge.m_vertex0.Copy(this.m_vertices[index - 1]);
    } else {
      edge.m_vertex0.Copy(this.m_prevVertex);
    }

    if (index < this.m_count - 2) {
      edge.m_vertex3.Copy(this.m_vertices[index + 2]);
    } else {
      edge.m_vertex3.Copy(this.m_nextVertex);
    }
  }

  /// This always return false.
  /// @see b2Shape::TestPoint
  public TestPoint(xf: b2Transform, p: XY): boolean {
    return false;
  }

  // #if B2_ENABLE_PARTICLE
  /// @see b2Shape::ComputeDistance
  private static ComputeDistance_s_edgeShape = new b2EdgeShape();
  public ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number {
    const edge = b2ChainShape.ComputeDistance_s_edgeShape;
    this.GetChildEdge(edge, childIndex);
    return edge.ComputeDistance(xf, p, normal, 0);
  }
  // #endif

  /// Implement b2Shape.
  private static RayCast_s_edgeShape = new b2EdgeShape();
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean {
    // DEBUG: b2Assert(childIndex < this.m_count);

    const edgeShape: b2EdgeShape = b2ChainShape.RayCast_s_edgeShape;

    edgeShape.m_vertex1.Copy(this.m_vertices[childIndex]);
    edgeShape.m_vertex2.Copy(this.m_vertices[(childIndex + 1) % this.m_count]);

    return edgeShape.RayCast(output, input, xf, 0);
  }

  /// @see b2Shape::ComputeAABB
  private static ComputeAABB_s_v1 = new b2Vec2();
  private static ComputeAABB_s_v2 = new b2Vec2();
  private static ComputeAABB_s_lower = new b2Vec2();
  private static ComputeAABB_s_upper = new b2Vec2();
  public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void {
    // DEBUG: b2Assert(childIndex < this.m_count);

    const vertexi1: b2Vec2 = this.m_vertices[childIndex];
    const vertexi2: b2Vec2 = this.m_vertices[(childIndex + 1) % this.m_count];

    const v1: b2Vec2 = b2Transform.MulXV(xf, vertexi1, b2ChainShape.ComputeAABB_s_v1);
    const v2: b2Vec2 = b2Transform.MulXV(xf, vertexi2, b2ChainShape.ComputeAABB_s_v2);

    const lower: b2Vec2 = b2Vec2.MinV(v1, v2, b2ChainShape.ComputeAABB_s_lower);
    const upper: b2Vec2 = b2Vec2.MaxV(v1, v2, b2ChainShape.ComputeAABB_s_upper);

    aabb.lowerBound.x = lower.x - this.m_radius;
    aabb.lowerBound.y = lower.y - this.m_radius;
    aabb.upperBound.x = upper.x + this.m_radius;
    aabb.upperBound.y = upper.y + this.m_radius;
  }

  /// Chains have zero mass.
  /// @see b2Shape::ComputeMass
  public ComputeMass(massData: b2MassData, density: number): void {
    massData.mass = 0;
    massData.center.SetZero();
    massData.I = 0;
  }

  public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void {
    // DEBUG: b2Assert(0 <= index && index < this.m_count);

    proxy.m_vertices = proxy.m_buffer;
    proxy.m_vertices[0].Copy(this.m_vertices[index]);
    if (index + 1 < this.m_count) {
      proxy.m_vertices[1].Copy(this.m_vertices[index + 1]);
    } else {
      proxy.m_vertices[1].Copy(this.m_vertices[0]);
    }
    proxy.m_count = 2;
    proxy.m_radius = this.m_radius;
  }

  public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number {
    c.SetZero();
    return 0;
  }

  public Dump(log: (format: string, ...args: any[]) => void): void {
    log("    const shape: b2ChainShape = new b2ChainShape();\n");
    log("    const vs: b2Vec2[] = [];\n");
    for (let i: number = 0; i < this.m_count; ++i) {
      log("    vs[%d] = new bVec2(%.15f, %.15f);\n", i, this.m_vertices[i].x, this.m_vertices[i].y);
    }
    log("    shape.CreateChain(vs, %d);\n", this.m_count);
    log("    shape.m_prevVertex.Set(%.15f, %.15f);\n", this.m_prevVertex.x, this.m_prevVertex.y);
    log("    shape.m_nextVertex.Set(%.15f, %.15f);\n", this.m_nextVertex.x, this.m_nextVertex.y);
  }
}
