import { litFragmentShader } from "@/engine/shaders/webgl/lit.frag";

/**
 * The lit fragment shader with the phase effect (IgeEntity.phase()) laid over it: the lit shader's own `main` runs as
 * `litMain` (so nothing in lit.frag.ts changes), then this one turns its colour into a glassy ghost: the body made
 * see-through, darkened and tinted, and a fresnel rim whose red, green and blue are pulled apart and ripple with time.
 * Compiled for the plain and skinned vertex shaders, with and without instancing (see shaderLibrary.ts).
 *
 * Uniforms (set per item): u_phase = (ghostliness 0..1, time, shimmer speed, rim power), u_phaseEdge = (rim colour,
 * rim strength), u_phaseBody = (tint, body opacity at ghostliness 1), u_phaseRipple = (waves per world unit, fringe split).
 * The ripple is igePhaseRipple() in IgePhase.ts.
 */
export const phaseFragmentShader = litFragmentShader.replace("void main() {", "void litMain() {") + `
uniform vec4 u_phase;
uniform vec4 u_phaseEdge;
uniform vec4 u_phaseBody;
uniform vec4 u_phaseRipple;

float phaseRipple (float time, float shimmer, float channel, float coord) {
	return 0.5 + 0.5 * sin(coord * 6.2831853 + time * shimmer * (0.55 + 0.23 * channel) + channel * 2.0943951);
}

void main() {
	litMain();
	float k = u_phase.x;
	if (k <= 0.0) return;
	vec4 lit = gl_FragColor;
	vec3 N = normalize(v_worldNormal);
	if (!gl_FrontFacing) N = -N;
	vec3 V = normalize(u_cameraPosition - v_worldPosition);
	float edge = 1.0 - clamp(dot(N, V), 0.0, 1.0);
	// Position along the body, in waves, so the ripple travels over it
	float along = dot(v_worldPosition, vec3(0.62, 1.0, 0.78)) * u_phaseRipple.x;
	vec3 rim;
	for (int c = 0; c < 3; c++) {
		float ch = float(c);
		float r = phaseRipple(u_phase.y, u_phase.z, ch, along + edge * 0.9);
		// Each channel's rim sits a little further in or out, and the ripple moves it
		float shifted = clamp(edge + u_phaseRipple.y * (r - 0.5) * 0.8 + u_phaseRipple.y * (ch - 1.0) * 0.12, 0.0, 1.0);
		float f = pow(shifted, u_phase.w) * (0.55 + 0.45 * r);
		rim[c] = f;
	}
	rim *= u_phaseEdge.rgb * u_phaseEdge.a * k;
	vec3 body = lit.rgb * mix(vec3(1.0), u_phaseBody.rgb * 0.45, k);
	float bodyAlpha = mix(1.0, u_phaseBody.a, k) * lit.a;
	float rimAlpha = clamp(max(rim.r, max(rim.g, rim.b)), 0.0, 1.0);
	float alpha = clamp(bodyAlpha + rimAlpha * (1.0 - bodyAlpha), 0.0, 1.0);
	// (Premultiplied sum, handed to the blend as a straight colour)
	gl_FragColor = vec4((body * bodyAlpha + rim) / max(alpha, 1e-4), alpha);
}
`;
