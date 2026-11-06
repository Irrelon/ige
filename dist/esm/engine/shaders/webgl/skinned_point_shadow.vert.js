import { skinningChunk, worldMatrixChunk } from "./chunks.js"
/**
 * Skinned point light shadow depth pass vertex shader.
 * Applies skeletal animation, then renders one cube face of the point
 * light's shadow atlas. Compiled with and without USE_INSTANCING
 * (see chunks.ts).
 */
export const skinnedPointShadowVertexShader = `
precision highp float;

attribute vec3 a_position;     // Vertex position

${worldMatrixChunk}
${skinningChunk}

uniform mat4 u_lightSpaceMatrix;     // Light face view * projection matrix

varying vec3 v_worldPosition;

void main() {
	vec3 skinnedPosition = a_position;

	if (u_useSkinning == 1) {
		skinnedPosition = (getSkinMatrix() * vec4(a_position, 1.0)).xyz;
	}

	vec4 worldPos = getWorldMatrix() * vec4(skinnedPosition, 1.0);
	v_worldPosition = worldPos.xyz;
	gl_Position = u_lightSpaceMatrix * worldPos;
}
`;
