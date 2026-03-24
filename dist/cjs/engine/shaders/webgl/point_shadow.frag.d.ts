/**
 * Point light shadow map fragment shader.
 * Writes linear distance from the fragment to the light, normalized by far plane.
 */
export declare const pointShadowFragmentShader = "\nprecision highp float;\n\nvarying vec3 v_worldPosition;\n\nuniform vec3 u_pointLightPosition;   // World position of the point light\nuniform float u_pointShadowFarPlane; // Far plane\n\nvoid main() {\n\tfloat depth = length(v_worldPosition - u_pointLightPosition) / u_pointShadowFarPlane;\n\tgl_FragColor = vec4(depth, 0.0, 0.0, 1.0);\n}\n";
