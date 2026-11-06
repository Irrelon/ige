/**
 * Particle vertex shader (IgeParticleSystem3d).
 * Expands the shared quad into a camera-facing square per particle.
 * The instanced variant (USE_INSTANCING) reads each particle's position,
 * size and colour from per-instance attributes; the fallback reads them
 * from uniforms and draws one particle per call.
 */
export declare const particleVertexShader = "\nprecision highp float;\n\nattribute vec2 a_position; // Quad corner (-0.5 to 0.5)\nattribute vec2 a_uv;\n\n#ifdef USE_INSTANCING\nattribute vec4 a_particle;      // xyz = world position, w = size\nattribute vec4 a_particleColor; // rgba\n#define PARTICLE a_particle\n#define PARTICLE_COLOR a_particleColor\n#else\nuniform vec4 u_particle;\nuniform vec4 u_particleColor;\n#define PARTICLE u_particle\n#define PARTICLE_COLOR u_particleColor\n#endif\n\nuniform mat4 u_viewMatrix;\nuniform mat4 u_projectionMatrix;\n\nvarying vec2 v_uv;\nvarying vec4 v_color;\n\nvoid main() {\n\t// Camera right/up in world space are the first two rows of the view rotation\n\tvec3 right = vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]);\n\tvec3 up = vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]);\n\tvec3 worldPos = PARTICLE.xyz + (right * a_position.x + up * a_position.y) * PARTICLE.w;\n\n\tv_uv = a_uv;\n\tv_color = PARTICLE_COLOR;\n\tgl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);\n}\n";
