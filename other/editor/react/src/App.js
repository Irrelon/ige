import React from "react";
import "./App.css";
import { jsx as _jsx, jsxs as _jsxs } from "ige-jsx/jsx-runtime";

function App() {
	return _jsxs("div", {
		children: [
			_jsx(
				"div",
				Object.assign(
					{ id: "topBar", className: "editorElem toggleHide" },
					{ children: _jsx("div", { className: "dropMenuContainer" }) }
				)
			),
			_jsx("div", { id: "leftBar", className: "editorElem toggleHide backed" }),
			_jsxs(
				"div",
				Object.assign(
					{ id: "rightBar", className: "editorElem toggleHide tabGroup backed" },
					{
						children: [
							_jsxs(
								"div",
								Object.assign(
									{ id: "tabs" },
									{
										children: [
											_jsx("div", { className: "tab1" }),
											_jsx("div", { className: "tab2" }),
											_jsx("div", { className: "tab3" }),
											_jsx("div", { className: "tab4" }),
											_jsx("div", { className: "tab5" }),
											_jsx("div", { className: "tab6" }),
											_jsx("div", { className: "tab7" }),
											_jsx("div", { className: "tab8" }),
											_jsx("div", { className: "tab9" })
										]
									}
								)
							),
							_jsx("div", { id: "tabContents", className: "tabContents" })
						]
					}
				)
			),
			_jsxs(
				"div",
				Object.assign(
					{ id: "editorControl", className: "editorElem" },
					{
						children: [
							_jsx(
								"div",
								Object.assign(
									{ id: "editorToggle", className: "header toggle" },
									{ children: "Editor Off" }
								)
							),
							_jsx(
								"div",
								Object.assign(
									{ id: "statsToggle", className: "header toggle" },
									{ children: "Stats Off" }
								)
							),
							_jsx(
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
							_jsx(
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
							_jsx(
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
							_jsx(
								"div",
								Object.assign(
									{ id: "editorDpf", className: "counter", title: "Draws Per Frame" },
									{ children: "..." }
								)
							),
							_jsx(
								"div",
								Object.assign(
									{ id: "editorDps", className: "counter", title: "Draws Per Second" },
									{ children: "..." }
								)
							),
							_jsx(
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
export default App;
