"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowVertexShader = void 0;
const chunks_1 = require("./chunks.js");
/**
 * Shadow map depth pass vertex shader (directional light).
 * Transforms geometry into light clip space. Compiled with and without
 * USE_INSTANCING (see chunks.ts).
 */
exports.shadowVertexShader = `
precision highp float;

attribute vec3 a_position;

${chunks_1.worldMatrixChunk}

uniform mat4 u_lightSpaceMatrix;     // Light view * projection matrix

void main() {
	gl_Position = u_lightSpaceMatrix * getWorldMatrix() * vec4(a_position, 1.0);
}
`;
