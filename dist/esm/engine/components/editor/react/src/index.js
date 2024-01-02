import React from "react";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { jsx as _jsx } from "ige-jsx/jsx-runtime";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.getElementById("igeEditorReactRoot"));
root.render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
