/**
 * Point light shadow map fragment shader.
 * Writes linear distance from the fragment to the light, normalized by far plane.
 * This is stored in the depth buffer via gl_FragDepth (WebGL 2) or packed into
 * RGBA (WebGL 1 fallback).
 */
export declare const pointShadowFragmentShader = "\nprecision highp float;\n\nvarying vec3 v_worldPosition;\n\nuniform vec3 u_pointLightPosition;   // World position of the point light\nuniform float u_pointShadowFarPlane; // Far plane = light range\n\nvoid main() {\n\t// Calculate linear distance from fragment to light\n\tfloat lightDistance = length(v_worldPosition - u_pointLightPosition);\n\n\t// Normalize to [0, 1] range using far plane\n\tlightDistance = lightDistance / u_pointShadowFarPlane;\n\n\t// Write to depth buffer\n\tgl_FragColor = vec4(lightDistance, lightDistance, lightDistance, 1.0);\n}\n";
