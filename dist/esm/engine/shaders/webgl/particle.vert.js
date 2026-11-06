/**
 * Particle vertex shader (IgeParticleSystem3d).
 * Expands the shared quad into a camera-facing square per particle.
 * The instanced variant (USE_INSTANCING) reads each particle's position,
 * size and colour from per-instance attributes; the fallback reads them
 * from uniforms and draws one particle per call.
 */
export const particleVertexShader = `
precision highp float;

attribute vec2 a_position; // Quad corner (-0.5 to 0.5)
attribute vec2 a_uv;

#ifdef USE_INSTANCING
attribute vec4 a_particle;      // xyz = world position, w = size
attribute vec4 a_particleColor; // rgba
#define PARTICLE a_particle
#define PARTICLE_COLOR a_particleColor
#else
uniform vec4 u_particle;
uniform vec4 u_particleColor;
#define PARTICLE u_particle
#define PARTICLE_COLOR u_particleColor
#endif

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec2 v_uv;
varying vec4 v_color;

void main() {
	// Camera right/up in world space are the first two rows of the view rotation
	vec3 right = vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]);
	vec3 up = vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]);
	vec3 worldPos = PARTICLE.xyz + (right * a_position.x + up * a_position.y) * PARTICLE.w;

	v_uv = a_uv;
	v_color = PARTICLE_COLOR;
	gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);
}
`;
