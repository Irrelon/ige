/**
 * PBR Lit fragment shader.
 * Supports both simple 2D textures and full PBR material workflow.
 * Can handle ambient, directional, point, and spot lights.
 *
 * For simple 2D textures (including smart textures):
 * - Just set u_baseColorTexture and u_baseColor
 * - Leave u_usePBR as 0
 *
 * For PBR materials:
 * - Set u_usePBR to 1
 * - Set metallic, roughness, and optionally PBR textures
 */
export const litFragmentShader = `
precision highp float;

// Maximum number of lights
#define MAX_POINT_LIGHTS 8
#define MAX_SPOT_LIGHTS 4

// Light type constants
#define LIGHT_TYPE_AMBIENT 0
#define LIGHT_TYPE_DIRECTIONAL 1
#define LIGHT_TYPE_POINT 2
#define LIGHT_TYPE_SPOT 3

// Varyings from vertex shader
varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying vec3 v_viewDirection;
varying mat3 v_TBN;

// Material uniforms
uniform sampler2D u_baseColorTexture;     // Diffuse/albedo texture (works for 2D textures and smart textures)
uniform vec4 u_baseColor;                 // Base color tint (default: white)
uniform float u_opacity;                  // Overall opacity

// PBR material uniforms
uniform int u_usePBR;                     // 0 = simple lighting, 1 = PBR
uniform float u_metallic;                 // Metallic value (0-1)
uniform float u_roughness;                // Roughness value (0-1)
uniform sampler2D u_metallicRoughnessTexture; // Combined metallic (B) + roughness (G) texture
uniform sampler2D u_normalTexture;        // Normal map
uniform int u_hasNormalMap;               // Whether normal map is used
uniform sampler2D u_emissiveTexture;      // Emissive texture
uniform vec3 u_emissiveColor;             // Emissive color
uniform float u_emissiveIntensity;        // Emissive intensity
uniform sampler2D u_aoTexture;            // Ambient occlusion texture
uniform float u_ambientOcclusion;         // AO value

// Ambient light
uniform vec3 u_ambientLightColor;
uniform float u_ambientLightIntensity;

// Directional light
uniform int u_hasDirectionalLight;
uniform vec3 u_directionalLightDir;       // Normalized direction TO the light (opposite of light direction)
uniform vec3 u_directionalLightColor;
uniform float u_directionalLightIntensity;

// Point lights
uniform int u_numPointLights;
uniform vec3 u_pointLightPositions[MAX_POINT_LIGHTS];
uniform vec3 u_pointLightColors[MAX_POINT_LIGHTS];
uniform float u_pointLightIntensities[MAX_POINT_LIGHTS];
uniform float u_pointLightRanges[MAX_POINT_LIGHTS];
uniform float u_pointLightDecays[MAX_POINT_LIGHTS];

// Spot lights
uniform int u_numSpotLights;
uniform vec3 u_spotLightPositions[MAX_SPOT_LIGHTS];
uniform vec3 u_spotLightDirections[MAX_SPOT_LIGHTS];
uniform vec3 u_spotLightColors[MAX_SPOT_LIGHTS];
uniform float u_spotLightIntensities[MAX_SPOT_LIGHTS];
uniform float u_spotLightRanges[MAX_SPOT_LIGHTS];
uniform float u_spotLightAngles[MAX_SPOT_LIGHTS];     // Outer cone angle (cos)
uniform float u_spotLightPenumbras[MAX_SPOT_LIGHTS];  // Penumbra amount

// Constants
const float PI = 3.14159265359;
const vec3 F0_DIELECTRIC = vec3(0.04); // F0 for non-metals

// ============================================================================
// PBR Helper Functions
// ============================================================================

// Fresnel-Schlick approximation
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
	return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Normal Distribution Function (GGX/Trowbridge-Reitz)
float distributionGGX(vec3 N, vec3 H, float roughness) {
	float a = roughness * roughness;
	float a2 = a * a;
	float NdotH = max(dot(N, H), 0.0);
	float NdotH2 = NdotH * NdotH;

	float num = a2;
	float denom = (NdotH2 * (a2 - 1.0) + 1.0);
	denom = PI * denom * denom;

	return num / max(denom, 0.0001);
}

// Geometry function (Schlick-GGX)
float geometrySchlickGGX(float NdotV, float roughness) {
	float r = (roughness + 1.0);
	float k = (r * r) / 8.0;

	float num = NdotV;
	float denom = NdotV * (1.0 - k) + k;

	return num / max(denom, 0.0001);
}

// Combined geometry function (Smith method)
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
	float NdotV = max(dot(N, V), 0.0);
	float NdotL = max(dot(N, L), 0.0);
	float ggx2 = geometrySchlickGGX(NdotV, roughness);
	float ggx1 = geometrySchlickGGX(NdotL, roughness);

	return ggx1 * ggx2;
}

// Calculate attenuation for point/spot lights
float calculateAttenuation(float distance, float range, float decay) {
	if (range <= 0.0) return 0.0;

	// Physical attenuation with configurable decay
	float d = distance / range;
	float attenuation = 1.0 / (1.0 + pow(d, decay));

	// Smooth falloff at range boundary
	float cutoff = clamp(1.0 - d, 0.0, 1.0);
	return attenuation * cutoff * cutoff;
}

// ============================================================================
// Light Calculation Functions
// ============================================================================

// Calculate simple diffuse lighting (for non-PBR)
vec3 calculateSimpleDiffuse(vec3 N, vec3 L, vec3 lightColor, float intensity, vec3 albedo) {
	float NdotL = max(dot(N, L), 0.0);
	return lightColor * intensity * albedo * NdotL;
}

// Calculate PBR lighting for a single light
vec3 calculatePBRLight(vec3 N, vec3 V, vec3 L, vec3 radiance, vec3 albedo, float metallic, float roughness) {
	vec3 H = normalize(V + L);

	// Calculate Fresnel reflectance at normal incidence
	vec3 F0 = mix(F0_DIELECTRIC, albedo, metallic);

	// Cook-Torrance BRDF
	float NDF = distributionGGX(N, H, roughness);
	float G = geometrySmith(N, V, L, roughness);
	vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

	// Calculate specular component
	vec3 numerator = NDF * G * F;
	float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
	vec3 specular = numerator / denominator;

	// Calculate diffuse component
	// kS is the energy of light that gets reflected (specular)
	// kD is the remaining energy (diffuse)
	vec3 kS = F;
	vec3 kD = vec3(1.0) - kS;
	// Metallic surfaces don't have diffuse reflection
	kD *= 1.0 - metallic;

	// Final contribution from this light
	float NdotL = max(dot(N, L), 0.0);
	return (kD * albedo / PI + specular) * radiance * NdotL;
}

void main() {
	// Sample base color texture
	vec4 texColor = texture2D(u_baseColorTexture, v_uv);

	// Apply base color tint
	vec4 albedoColor = texColor * u_baseColor;
	vec3 albedo = albedoColor.rgb;

	// Get normal (optionally from normal map)
	vec3 N = normalize(v_worldNormal);
	if (u_hasNormalMap == 1) {
		vec3 normalMap = texture2D(u_normalTexture, v_uv).xyz * 2.0 - 1.0;
		N = normalize(v_TBN * normalMap);
	}

	// View direction
	vec3 V = normalize(v_viewDirection);

	// Initialize final color
	vec3 finalColor = vec3(0.0);

	if (u_usePBR == 0) {
		// ================================================================
		// SIMPLE LIGHTING MODE (for 2D textures and smart textures)
		// ================================================================

		// Ambient light
		finalColor += u_ambientLightColor * u_ambientLightIntensity * albedo;

		// Directional light
		if (u_hasDirectionalLight == 1) {
			finalColor += calculateSimpleDiffuse(N, u_directionalLightDir, u_directionalLightColor, u_directionalLightIntensity, albedo);
		}

		// Point lights
		for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
			if (i >= u_numPointLights) break;

			vec3 lightVec = u_pointLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			float attenuation = calculateAttenuation(distance, u_pointLightRanges[i], u_pointLightDecays[i]);
			float intensity = u_pointLightIntensities[i] * attenuation;

			finalColor += calculateSimpleDiffuse(N, L, u_pointLightColors[i], intensity, albedo);
		}

		// Spot lights
		for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
			if (i >= u_numSpotLights) break;

			vec3 lightVec = u_spotLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			// Spotlight cone attenuation
			float theta = dot(L, normalize(-u_spotLightDirections[i]));
			float epsilon = u_spotLightPenumbras[i];
			float spotAttenuation = clamp((theta - u_spotLightAngles[i]) / epsilon, 0.0, 1.0);

			float distAttenuation = calculateAttenuation(distance, u_spotLightRanges[i], 2.0);
			float intensity = u_spotLightIntensities[i] * distAttenuation * spotAttenuation;

			finalColor += calculateSimpleDiffuse(N, L, u_spotLightColors[i], intensity, albedo);
		}

	} else {
		// ================================================================
		// PBR LIGHTING MODE
		// ================================================================

		// Sample PBR textures
		vec4 mrSample = texture2D(u_metallicRoughnessTexture, v_uv);
		float metallic = u_metallic * mrSample.b;
		float roughness = u_roughness * mrSample.g;
		roughness = clamp(roughness, 0.04, 1.0); // Prevent divide by zero in NDF

		float ao = u_ambientOcclusion * texture2D(u_aoTexture, v_uv).r;

		// Ambient light with PBR (simplified IBL approximation)
		vec3 F0 = mix(F0_DIELECTRIC, albedo, metallic);
		vec3 kS = fresnelSchlick(max(dot(N, V), 0.0), F0);
		vec3 kD = (1.0 - kS) * (1.0 - metallic);
		vec3 ambient = (kD * albedo + kS * 0.1) * u_ambientLightColor * u_ambientLightIntensity * ao;
		finalColor += ambient;

		// Directional light
		if (u_hasDirectionalLight == 1) {
			vec3 radiance = u_directionalLightColor * u_directionalLightIntensity;
			finalColor += calculatePBRLight(N, V, u_directionalLightDir, radiance, albedo, metallic, roughness);
		}

		// Point lights
		for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
			if (i >= u_numPointLights) break;

			vec3 lightVec = u_pointLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			float attenuation = calculateAttenuation(distance, u_pointLightRanges[i], u_pointLightDecays[i]);
			vec3 radiance = u_pointLightColors[i] * u_pointLightIntensities[i] * attenuation;

			finalColor += calculatePBRLight(N, V, L, radiance, albedo, metallic, roughness);
		}

		// Spot lights
		for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
			if (i >= u_numSpotLights) break;

			vec3 lightVec = u_spotLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			// Spotlight cone attenuation
			float theta = dot(L, normalize(-u_spotLightDirections[i]));
			float epsilon = u_spotLightPenumbras[i];
			float spotAttenuation = clamp((theta - u_spotLightAngles[i]) / epsilon, 0.0, 1.0);

			float distAttenuation = calculateAttenuation(distance, u_spotLightRanges[i], 2.0);
			vec3 radiance = u_spotLightColors[i] * u_spotLightIntensities[i] * distAttenuation * spotAttenuation;

			finalColor += calculatePBRLight(N, V, L, radiance, albedo, metallic, roughness);
		}
	}

	// Add emissive
	vec3 emissive = u_emissiveColor * u_emissiveIntensity * texture2D(u_emissiveTexture, v_uv).rgb;
	finalColor += emissive;

	// Apply opacity
	float finalAlpha = albedoColor.a * u_opacity;

	// Output final color (no gamma correction - let the display handle it)
	gl_FragColor = vec4(finalColor, finalAlpha);
}
`;
