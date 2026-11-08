"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decalVertexShader = void 0;
/**
 * Decal vertex shader (IgeDecalSystem3d).
 * Lays the shared quad flat on the ground (XZ plane) at each decal's
 * position, size and rotation, and picks its cell of the texture atlas.
 * The instanced variant (USE_INSTANCING) reads each decal from per-instance
 * attributes; the fallback reads one decal from uniforms per draw call.
 */
exports.decalVertexShader = `
precision highp float;

attribute vec2 a_position; // Quad corner (-0.5 to 0.5)
attribute vec2 a_uv;

#ifdef USE_INSTANCING
attribute vec4 a_decal;      // xyz = world position, w = size
attribute vec4 a_decalColor; // rgba (a includes the fade)
attribute vec4 a_decalShape; // x = rotation (radians), y = atlas cell
#define DECAL a_decal
#define DECAL_COLOR a_decalColor
#define DECAL_SHAPE a_decalShape
#else
uniform vec4 u_decal;
uniform vec4 u_decalColor;
uniform vec4 u_decalShape;
#define DECAL u_decal
#define DECAL_COLOR u_decalColor
#define DECAL_SHAPE u_decalShape
#endif

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform float u_atlasGrid; // Cells per side of the texture atlas

varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_worldPosition;

void main() {
	float c = cos(DECAL_SHAPE.x);
	float s = sin(DECAL_SHAPE.x);
	vec2 corner = a_position * DECAL.w;
	vec2 offset = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
	vec3 worldPos = vec3(DECAL.x + offset.x, DECAL.y, DECAL.z + offset.y);

	float cell = DECAL_SHAPE.y;
	vec2 cellXY = vec2(mod(cell, u_atlasGrid), floor(cell / u_atlasGrid));
	v_uv = (a_uv + cellXY) / u_atlasGrid;
	v_color = DECAL_COLOR;
	v_worldPosition = worldPos;
	gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);
}
`;
