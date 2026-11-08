"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_irrelon_ige"] = self["webpackChunk_irrelon_ige"] || []).push([["src_engine_core_igeCreateRenderer_ts"],{

/***/ "./src/engine/core/igeCreateRenderer.ts":
/*!**********************************************!*\
  !*** ./src/engine/core/igeCreateRenderer.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   igeCreateRenderer: () => (/* binding */ igeCreateRenderer),\n/* harmony export */   igeWebGlAvailable: () => (/* binding */ igeWebGlAvailable)\n/* harmony export */ });\n/* harmony import */ var _engine_core_IgeCanvas2dRenderer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/engine/core/IgeCanvas2dRenderer */ \"./src/engine/core/IgeCanvas2dRenderer.ts\");\n/* harmony import */ var _engine_core_IgeWebGlRenderer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/engine/core/IgeWebGlRenderer */ \"./src/engine/core/IgeWebGlRenderer.ts\");\n\n\nlet webGlSupport;\n/** Whether the browser can create a WebGL context (checked once). */\nfunction igeWebGlAvailable() {\n    if (webGlSupport !== undefined)\n        return webGlSupport;\n    try {\n        const canvas = typeof document !== \"undefined\" ? document.createElement(\"canvas\") : undefined;\n        webGlSupport = !!canvas && !!(canvas.getContext(\"webgl2\") || canvas.getContext(\"webgl\"));\n    }\n    catch (_a) {\n        webGlSupport = false;\n    }\n    return webGlSupport;\n}\n/**\n * Create the renderer a game should use: IgeWebGlRenderer when the browser\n * supports WebGL, else IgeCanvas2dRenderer. Assign it with\n * ige.engine.renderer(renderer); ige.engine.start() does all of this itself\n * when no renderer has been assigned.\n * @example #A 2D game that runs on WebGL where it can\n *     ige.engine.renderer(igeCreateRenderer({ mode: \"2d\" }));\n *     await ige.engine.start();\n */\nfunction igeCreateRenderer(options = {}) {\n    var _a;\n    const mode = (_a = options.mode) !== null && _a !== void 0 ? _a : \"2d\";\n    const useWebGl = mode !== \"iso\" && options.prefer !== \"canvas2d\" && (options.prefer === \"webgl\" || igeWebGlAvailable());\n    if (!useWebGl) {\n        if (mode === \"3d\")\n            console.warn(\"igeCreateRenderer: WebGL isn't available, so 3D content won't draw (falling back to Canvas 2D)\");\n        return new _engine_core_IgeCanvas2dRenderer__WEBPACK_IMPORTED_MODULE_0__.IgeCanvas2dRenderer();\n    }\n    const renderer = new _engine_core_IgeWebGlRenderer__WEBPACK_IMPORTED_MODULE_1__.IgeWebGlRenderer();\n    if (mode === \"2d\")\n        renderer.defaultCameraPreset(\"screen2d\");\n    return renderer;\n}\n\n\n//# sourceURL=webpack://@irrelon/ige/./src/engine/core/igeCreateRenderer.ts?");

/***/ })

}]);