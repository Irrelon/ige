/**
 * PBR Lit fragment shader.
 * Supports both simple 2D textures and full PBR material workflow.
 * Can handle ambient, directional, point, and spot lights.
 * Supports shadow mapping for directional lights.
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
varying vec4 v_lightSpacePos;

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

// Shadow mapping uniforms
uniform int u_hasShadowMap;           // Whether shadow map is active
uniform sampler2D u_shadowMap;        // Shadow map texture
uniform float u_shadowBias;           // Shadow bias to prevent acne
uniform float u_shadowNormalBias;     // Normal-based bias
uniform float u_shadowMapSize;        // Size of shadow map for PCF
uniform int u_usePackedDepth;         // Whether depth is packed (WebGL 1)

// Point light shadow mapping uniforms
// Each point light shadow uses a single 3x2 atlas texture (1 sampler per light)
#define MAX_SHADOW_POINT_LIGHTS 2
uniform int u_numShadowPointLights;
uniform int u_pointShadowLightIndex[MAX_SHADOW_POINT_LIGHTS];   // Which point light index casts shadows
uniform sampler2D u_pointShadowAtlas[MAX_SHADOW_POINT_LIGHTS];  // Atlas textures (1 per light)
uniform float u_pointShadowFarPlane[MAX_SHADOW_POINT_LIGHTS];
uniform float u_pointShadowBias[MAX_SHADOW_POINT_LIGHTS];
uniform float u_pointShadowFaceSize[MAX_SHADOW_POINT_LIGHTS];   // Face size in pixels
uniform mat4 u_pointShadowMatrices[12];                          // 6 matrices per light, 2 lights max

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
// Shadow Mapping Functions
// ============================================================================

// Unpack depth from RGBA (WebGL 1)
float unpackDepth(vec4 packedDepth) {
	const vec4 bitShift = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(packedDepth, bitShift);
}

// Debug uniform - set to visualize different values:
// 0 = normal shadow, 1 = projCoords.xy, 2 = projCoords.z, 3 = sampleDepth, 4 = comparison
uniform int u_shadowDebug;

// Calculate shadow factor using PCF (Percentage Closer Filtering)
float calculateShadow(vec3 normal, vec3 lightDir) {
	if (u_hasShadowMap == 0) return 1.0;

	// Perform perspective divide
	vec3 projCoords = v_lightSpacePos.xyz / v_lightSpacePos.w;

	// Transform to [0,1] range
	projCoords = projCoords * 0.5 + 0.5;

	// Check if outside shadow map bounds
	if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
	    projCoords.y < 0.0 || projCoords.y > 1.0) {
		return 1.0;
	}

	// Calculate bias based on surface angle to light
	float cosTheta = max(dot(normal, lightDir), 0.0);
	float bias = u_shadowBias + u_shadowNormalBias * (1.0 - cosTheta);

	// Current fragment depth
	float currentDepth = projCoords.z;

	// Sample center depth for debug
	float centerDepth;
	if (u_usePackedDepth == 1) {
		centerDepth = unpackDepth(texture2D(u_shadowMap, projCoords.xy));
	} else {
		centerDepth = texture2D(u_shadowMap, projCoords.xy).r;
	}

	// PCF sampling for soft shadows
	float shadow = 0.0;
	float texelSize = 1.0 / u_shadowMapSize;

	// 3x3 PCF kernel
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			vec2 sampleCoord = projCoords.xy + vec2(float(x), float(y)) * texelSize;

			float sampleDepth;
			if (u_usePackedDepth == 1) {
				// WebGL 1: unpack depth from RGBA
				sampleDepth = unpackDepth(texture2D(u_shadowMap, sampleCoord));
			} else {
				// WebGL 2: read depth directly
				sampleDepth = texture2D(u_shadowMap, sampleCoord).r;
			}

			shadow += (currentDepth - bias > sampleDepth) ? 0.0 : 1.0;
		}
	}

	// Average the samples
	shadow /= 9.0;

	return shadow;
}

// ============================================================================
// Point Light Shadow Functions (Atlas-based)
// ============================================================================

// Get the atlas UV offset for a cube face.
// Atlas layout 3x2: row0=[+X(0), -X(1), +Y(2)], row1=[-Y(3), +Z(4), -Z(5)]
// Returns offset in [0,1] UV space for the atlas texture.
vec2 getAtlasFaceUVOffset(int face) {
	// col = face % 3, row = face / 3
	// In UV space: offsetU = col/3, offsetV = row/2
	if (face == 0) return vec2(0.0,       0.0);       // +X: col0, row0
	if (face == 1) return vec2(1.0 / 3.0, 0.0);       // -X: col1, row0
	if (face == 2) return vec2(2.0 / 3.0, 0.0);       // +Y: col2, row0
	if (face == 3) return vec2(0.0,       0.5);        // -Y: col0, row1
	if (face == 4) return vec2(1.0 / 3.0, 0.5);       // +Z: col1, row1
	return            vec2(2.0 / 3.0, 0.5);            // -Z: col2, row1
}

// Determine which cube face to sample based on the direction from light to fragment.
int getPointShadowFace(vec3 fragToLight) {
	vec3 a = abs(fragToLight);
	if (a.x >= a.y && a.x >= a.z) {
		return fragToLight.x > 0.0 ? 0 : 1;
	} else if (a.y >= a.x && a.y >= a.z) {
		return fragToLight.y > 0.0 ? 2 : 3;
	} else {
		return fragToLight.z > 0.0 ? 4 : 5;
	}
}

// Get the light-space matrix for a given shadow index and face.
// shadowIndex 0 uses matrices [0..5], shadowIndex 1 uses [6..11].
mat4 getPointShadowMatrix(int shadowIndex, int face) {
	int idx = shadowIndex * 6 + face;
	// GLSL ES requires constant index for arrays, so we use an if-chain
	if (idx == 0)  return u_pointShadowMatrices[0];
	if (idx == 1)  return u_pointShadowMatrices[1];
	if (idx == 2)  return u_pointShadowMatrices[2];
	if (idx == 3)  return u_pointShadowMatrices[3];
	if (idx == 4)  return u_pointShadowMatrices[4];
	if (idx == 5)  return u_pointShadowMatrices[5];
	if (idx == 6)  return u_pointShadowMatrices[6];
	if (idx == 7)  return u_pointShadowMatrices[7];
	if (idx == 8)  return u_pointShadowMatrices[8];
	if (idx == 9)  return u_pointShadowMatrices[9];
	if (idx == 10) return u_pointShadowMatrices[10];
	return u_pointShadowMatrices[11];
}

// Interleaved gradient noise for per-pixel sample rotation (eliminates banding)
float interleavedGradientNoise(vec2 fragCoord) {
	vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
	return fract(magic.z * fract(dot(fragCoord, magic.xy)));
}

// Vogel disk sample: distributes N points uniformly on a unit disk
vec2 vogelDiskSample(int sampleIndex, int totalSamples, float phi) {
	float goldenAngle = 2.4; // ~137.5 degrees
	float r = sqrt(float(sampleIndex) + 0.5) / sqrt(float(totalSamples));
	float theta = float(sampleIndex) * goldenAngle + phi;
	return vec2(r * cos(theta), r * sin(theta));
}

// Internal: PCF point shadow for shadow slot 0 using Vogel disk (5 samples)
float _calcPointShadow0(vec3 lightPos) {
	vec3 fragToLight = v_worldPosition - lightPos;
	float currentDistance = length(fragToLight) / u_pointShadowFarPlane[0];
	if (currentDistance > 1.0) return 1.0;

	int face = getPointShadowFace(fragToLight);
	mat4 lsMatrix = getPointShadowMatrix(0, face);
	vec4 lightSpacePos = lsMatrix * vec4(v_worldPosition, 1.0);
	vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
	projCoords = projCoords * 0.5 + 0.5;

	if (projCoords.x < 0.0 || projCoords.x > 1.0 ||
	    projCoords.y < 0.0 || projCoords.y > 1.0) return 1.0;

	vec2 faceOffset = getAtlasFaceUVOffset(face);
	vec2 atlasUV = faceOffset + projCoords.xy * vec2(1.0 / 3.0, 0.5);

	// Texel size within the face region of the atlas
	float texelU = (1.0 / 3.0) / u_pointShadowFaceSize[0];
	float texelV = 0.5 / u_pointShadowFaceSize[0];
	float bias = u_pointShadowBias[0];

	// Per-pixel rotation angle from interleaved gradient noise
	float phi = interleavedGradientNoise(gl_FragCoord.xy) * 6.2832;

	// 5-sample Vogel disk PCF with ~2 texel radius
	float shadow = 0.0;
	float radius = 2.0;
	for (int i = 0; i < 5; i++) {
		vec2 offset = vogelDiskSample(i, 5, phi) * radius;
		vec2 sampleUV = atlasUV + vec2(offset.x * texelU, offset.y * texelV);
		float storedDepth = texture2D(u_pointShadowAtlas[0], sampleUV).r;
		shadow += (currentDistance - bias > storedDepth) ? 0.0 : 1.0;
	}
	return shadow / 5.0;
}

// Internal: PCF point shadow for shadow slot 1 using Vogel disk (5 samples)
float _calcPointShadow1(vec3 lightPos) {
	vec3 fragToLight = v_worldPosition - lightPos;
	float currentDistance = length(fragToLight) / u_pointShadowFarPlane[1];
	if (currentDistance > 1.0) return 1.0;

	int face = getPointShadowFace(fragToLight);
	mat4 lsMatrix = getPointShadowMatrix(1, face);
	vec4 lightSpacePos = lsMatrix * vec4(v_worldPosition, 1.0);
	vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
	projCoords = projCoords * 0.5 + 0.5;

	if (projCoords.x < 0.0 || projCoords.x > 1.0 ||
	    projCoords.y < 0.0 || projCoords.y > 1.0) return 1.0;

	vec2 faceOffset = getAtlasFaceUVOffset(face);
	vec2 atlasUV = faceOffset + projCoords.xy * vec2(1.0 / 3.0, 0.5);

	float texelU = (1.0 / 3.0) / u_pointShadowFaceSize[1];
	float texelV = 0.5 / u_pointShadowFaceSize[1];
	float bias = u_pointShadowBias[1];

	float phi = interleavedGradientNoise(gl_FragCoord.xy) * 6.2832;

	float shadow = 0.0;
	float radius = 2.0;
	for (int i = 0; i < 5; i++) {
		vec2 offset = vogelDiskSample(i, 5, phi) * radius;
		vec2 sampleUV = atlasUV + vec2(offset.x * texelU, offset.y * texelV);
		float storedDepth = texture2D(u_pointShadowAtlas[1], sampleUV).r;
		shadow += (currentDistance - bias > storedDepth) ? 0.0 : 1.0;
	}
	return shadow / 5.0;
}

// Get the point shadow factor for point light at loop index i.
// Must be called from a for-loop where i is the loop variable,
// because GLSL ES only allows loop vars or constants as array indices.
// We pass lightPos explicitly to avoid indexing u_pointLightPositions with a non-loop var.
float getPointLightShadow(int i, vec3 lightPos) {
	for (int s = 0; s < MAX_SHADOW_POINT_LIGHTS; s++) {
		if (s >= u_numShadowPointLights) break;
		if (u_pointShadowLightIndex[s] == i) {
			if (s == 0) return _calcPointShadow0(lightPos);
			else        return _calcPointShadow1(lightPos);
		}
	}
	return 1.0;
}

// Debug function to visualize shadow map values
vec3 debugShadowValues(vec3 normal, vec3 lightDir) {
	vec3 projCoords = v_lightSpacePos.xyz / v_lightSpacePos.w;
	projCoords = projCoords * 0.5 + 0.5;

	float centerDepth;
	if (u_usePackedDepth == 1) {
		centerDepth = unpackDepth(texture2D(u_shadowMap, projCoords.xy));
	} else {
		centerDepth = texture2D(u_shadowMap, projCoords.xy).r;
	}

	if (u_shadowDebug == 1) {
		// Visualize projCoords.xy (should be 0-1 range, show as red/green)
		return vec3(projCoords.x, projCoords.y, 0.0);
	} else if (u_shadowDebug == 2) {
		// Visualize projCoords.z (fragment depth in light space)
		return vec3(projCoords.z, projCoords.z, projCoords.z);
	} else if (u_shadowDebug == 3) {
		// Visualize sampled depth from shadow map
		return vec3(centerDepth, centerDepth, centerDepth);
	} else if (u_shadowDebug == 4) {
		// Visualize depth comparison (red = in shadow, green = lit)
		float bias = u_shadowBias;
		if (projCoords.z - bias > centerDepth) {
			return vec3(1.0, 0.0, 0.0); // Red = in shadow
		} else {
			return vec3(0.0, 1.0, 0.0); // Green = lit
		}
	}

	return vec3(0.0);
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

		// Directional light with shadows
		if (u_hasDirectionalLight == 1) {
			float shadow = calculateShadow(N, u_directionalLightDir);
			finalColor += calculateSimpleDiffuse(N, u_directionalLightDir, u_directionalLightColor, u_directionalLightIntensity, albedo) * shadow;
		}

		// Point lights
		for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
			if (i >= u_numPointLights) break;

			vec3 lightVec = u_pointLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			float attenuation = calculateAttenuation(distance, u_pointLightRanges[i], u_pointLightDecays[i]);
			float intensity = u_pointLightIntensities[i] * attenuation;

			float ptShadow = getPointLightShadow(i, u_pointLightPositions[i]);
			finalColor += calculateSimpleDiffuse(N, L, u_pointLightColors[i], intensity, albedo) * ptShadow;
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

		// Directional light with shadows
		if (u_hasDirectionalLight == 1) {
			float shadow = calculateShadow(N, u_directionalLightDir);
			vec3 radiance = u_directionalLightColor * u_directionalLightIntensity;
			finalColor += calculatePBRLight(N, V, u_directionalLightDir, radiance, albedo, metallic, roughness) * shadow;
		}

		// Point lights
		for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
			if (i >= u_numPointLights) break;

			vec3 lightVec = u_pointLightPositions[i] - v_worldPosition;
			float distance = length(lightVec);
			vec3 L = normalize(lightVec);

			float attenuation = calculateAttenuation(distance, u_pointLightRanges[i], u_pointLightDecays[i]);
			vec3 radiance = u_pointLightColors[i] * u_pointLightIntensities[i] * attenuation;

			float ptShadow = getPointLightShadow(i, u_pointLightPositions[i]);
			finalColor += calculatePBRLight(N, V, L, radiance, albedo, metallic, roughness) * ptShadow;
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

	// Debug output override - visualize shadow map values
	if (u_shadowDebug > 0 && u_hasShadowMap == 1) {
		vec3 debugColor = debugShadowValues(N, u_directionalLightDir);
		gl_FragColor = vec4(debugColor, 1.0);
		return;
	}

	// Output final color (no gamma correction - let the display handle it)
	gl_FragColor = vec4(finalColor, finalAlpha);
}
`;
