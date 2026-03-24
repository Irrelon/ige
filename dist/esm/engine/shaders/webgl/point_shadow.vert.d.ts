/**
 * Point light shadow map vertex shader.
 * Transforms vertices to world space and passes world position to fragment shader
 * for linear distance calculation.
 */
export declare const pointShadowVertexShader = "\nprecision highp float;\n\n// Vertex attributes\nattribute vec3 a_position;\n\n// Uniforms\nuniform mat4 u_worldMatrix;          // Entity world transform\nuniform mat4 u_lightSpaceMatrix;     // Light face view * projection matrix\n\n// Pass world position to fragment shader for distance calculation\nvarying vec3 v_worldPosition;\n\nvoid main() {\n\tvec4 worldPos = u_worldMatrix * vec4(a_position, 1.0);\n\tv_worldPosition = worldPos.xyz;\n\tgl_Position = u_lightSpaceMatrix * worldPos;\n}\n";
