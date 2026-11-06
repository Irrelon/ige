import { worldMatrixChunk } from "./chunks.js"
/**
 * Point light shadow depth pass vertex shader.
 * Renders one cube face of the point light's shadow atlas and passes the
 * world position through so the fragment shader can store linear distance.
 * Compiled with and without USE_INSTANCING (see chunks.ts).
 */
export const pointShadowVertexShader = `
precision highp float;

attribute vec3 a_position;

${worldMatrixChunk}

uniform mat4 u_lightSpaceMatrix;     // Light face view * projection matrix

varying vec3 v_worldPosition;

void main() {
	vec4 worldPos = getWorldMatrix() * vec4(a_position, 1.0);
	v_worldPosition = worldPos.xyz;
	gl_Position = u_lightSpaceMatrix * worldPos;
}
`;
