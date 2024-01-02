"use strict";
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
const getFiles_1 = require("./getFiles");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const __dirname = path_1.default.resolve("../");
const matchPattern = ["*.tsx", "**/*.tsx"];
const excludePattern = ["node_modules", "react", ".git", "*.d.ts", "**/*.d.ts"];
const processFile = (filePath) => {
	const sourceFile = typescript_1.default.createSourceFile(
		filePath,
		(0, fs_1.readFileSync)(filePath).toString(),
		9,
		/*setParentNodes */ true
	);
	debugger;
};
(0, getFiles_1.getFiles)(__dirname, matchPattern, excludePattern).then((filePaths) => {
	filePaths.forEach((filePath) => {
		processFile(filePath);
	});
});
