import React from "react";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals.js";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.getElementById("igeEditorReactRoot"));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
