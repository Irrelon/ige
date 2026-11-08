"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decalMeshVertexShader = void 0;
/**
 * Projected decal vertex shader (IgeDecalSystem3d.project()). The decal
 * triangles are already in world space with atlas UVs and a per-vertex
 * colour (alpha includes the fade); the fragment shader is the flat
 * decals' one.
 */
exports.decalMeshVertexShader = `
precision highp float;

attribute vec3 a_position;
attribute vec2 a_uv;
attribute vec4 a_color;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_worldPosition;

void main() {
	v_uv = a_uv;
	v_color = a_color;
	v_worldPosition = a_position;
	gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
}
`;
