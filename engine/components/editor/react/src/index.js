import { jsx as _jsx } from "ige-jsx/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from "./App.js";
import reportWebVitals from "./reportWebVitals.js";
const root = ReactDOM.createRoot(document.getElementById('igeEditorReactRoot'));
root.render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
