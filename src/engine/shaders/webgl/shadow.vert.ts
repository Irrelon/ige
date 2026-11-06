import { worldMatrixChunk } from "@/engine/shaders/webgl/chunks";

/**
 * Shadow map depth pass vertex shader (directional light).
 * Transforms geometry into light clip space. Compiled with and without
 * USE_INSTANCING (see chunks.ts).
 */
export const shadowVertexShader = `
precision highp float;

attribute vec3 a_position;

${worldMatrixChunk}

uniform mat4 u_lightSpaceMatrix;     // Light view * projection matrix

void main() {
	gl_Position = u_lightSpaceMatrix * getWorldMatrix() * vec4(a_position, 1.0);
}
`;
