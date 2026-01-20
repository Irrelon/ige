/**
 * Shadow map depth vertex shader.
 * Renders geometry from the light's perspective to create a depth map.
 */
export declare const shadowVertexShader = "\nprecision highp float;\n\n// Vertex attributes\nattribute vec3 a_position;\n\n// Uniforms\nuniform mat4 u_worldMatrix;          // Entity world transform\nuniform mat4 u_lightSpaceMatrix;     // Light view * projection matrix\n\nvoid main() {\n\t// Transform vertex position to light space\n\tgl_Position = u_lightSpaceMatrix * u_worldMatrix * vec4(a_position, 1.0);\n}\n";
