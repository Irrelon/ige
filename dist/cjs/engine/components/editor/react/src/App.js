"use strict";
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("ige-jsx/jsx-runtime");
const react_1 = __importDefault(require("react"));
require("./App.css");
function App() {
	return (0, jsx_runtime_1.jsxs)("div", {
		children: [
			(0, jsx_runtime_1.jsx)(
				"div",
				Object.assign(
					{ id: "topBar", className: "editorElem toggleHide" },
					{ children: (0, jsx_runtime_1.jsx)("div", { className: "dropMenuContainer" }) }
				)
			),
			(0, jsx_runtime_1.jsx)("div", { id: "leftBar", className: "editorElem toggleHide backed" }),
			(0, jsx_runtime_1.jsxs)(
				"div",
				Object.assign(
					{ id: "rightBar", className: "editorElem toggleHide tabGroup backed" },
					{
						children: [
							(0, jsx_runtime_1.jsxs)(
								"div",
								Object.assign(
									{ id: "tabs" },
									{
										children: [
											(0, jsx_runtime_1.jsx)("div", { className: "tab1" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab2" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab3" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab4" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab5" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab6" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab7" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab8" }),
											(0, jsx_runtime_1.jsx)("div", { className: "tab9" })
										]
									}
								)
							),
							(0, jsx_runtime_1.jsx)("div", { id: "tabContents", className: "tabContents" })
						]
					}
				)
			),
			(0, jsx_runtime_1.jsxs)(
				"div",
				Object.assign(
					{ id: "editorControl", className: "editorElem" },
					{
						children: [
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{ id: "editorToggle", className: "header toggle" },
									{ children: "Editor Off" }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{ id: "statsToggle", className: "header toggle" },
									{ children: "Stats Off" }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{
										id: "editorTd",
										className: "counter",
										title: "Total Delta (How Long the Last Frame Took to Process)"
									},
									{ children: "..." }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{
										id: "editorRd",
										className: "counter",
										title: "Render Delta (How Long the Last Render Took)"
									},
									{ children: "..." }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{
										id: "editorUd",
										className: "counter",
										title: "Update Delta (How Long the Last Update Took)"
									},
									{ children: "..." }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{ id: "editorDpf", className: "counter", title: "Draws Per Frame" },
									{ children: "..." }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{ id: "editorDps", className: "counter", title: "Draws Per Second" },
									{ children: "..." }
								)
							),
							(0, jsx_runtime_1.jsx)(
								"div",
								Object.assign(
									{ id: "editorFps", className: "counter", title: "Frames Per Second" },
									{ children: "..." }
								)
							)
						]
					}
				)
			)
		]
	});
}
exports.default = App;
