import { skinningChunk, worldMatrixChunk } from "./chunks.js"
/**
 * Skinned shadow map depth pass vertex shader (directional light).
 * Applies skeletal animation before projecting into light clip space so
 * animated characters cast correctly posed shadows. Compiled with and
 * without USE_INSTANCING (see chunks.ts).
 */
export const skinnedShadowVertexShader = `
precision highp float;

attribute vec3 a_position;     // Vertex position

${worldMatrixChunk}
${skinningChunk}

uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix

void main() {
	vec3 skinnedPosition = a_position;

	if (u_useSkinning == 1) {
		skinnedPosition = (getSkinMatrix() * vec4(a_position, 1.0)).xyz;
	}

	vec4 worldPos = getWorldMatrix() * vec4(skinnedPosition, 1.0);
	gl_Position = u_lightSpaceMatrix * worldPos;
}
`;
