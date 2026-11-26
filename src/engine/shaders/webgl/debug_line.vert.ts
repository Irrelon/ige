import { colorSpaceChunk } from "@/engine/shaders/webgl/chunks";

/**
 * Debug line vertex shader: world-space line vertices with a colour each
 * (see IgeWebGlRenderer.debugLine() and debugDraw()).
 */
export const debugLineVertexShader = `
precision highp float;

attribute vec3 a_position;
attribute vec4 a_color;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec4 v_color;
${colorSpaceChunk}

void main() {
	v_color = a_color;
#ifdef IGE_LINEAR
	v_color.rgb = igeSrgbToLinear(v_color.rgb);
#endif
	gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
}
`;
