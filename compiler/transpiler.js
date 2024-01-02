"use strict";
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
const getFiles_1 = require("./getFiles");
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const esprima_1 = __importDefault(require("esprima"));
var JsxEmit = typescript_1.default.JsxEmit;
const fs_1 = require("fs");
const __dirname = path_1.default.resolve("../");
const matchPattern = ["*.tsx", "**/*.tsx"];
const excludePattern = ["node_modules", "react", ".git", "*.d.ts", "**/*.d.ts"];
const processFile = (filePath) => {
	const fileContent = (0, fs_1.readFileSync)(filePath).toString();
	const program = typescript_1.default.transpileModule(fileContent, {
		compilerOptions: {
			downlevelIteration: true,
			baseUrl: ".",
			paths: {
				"@/types/*": ["types/*"],
				"@/engine/*": ["engine/*"],
				"@/enums/*": ["enums/*"],
				"@/examples/*": ["examples/*"]
			},
			target: typescript_1.default.ScriptTarget.ES2020,
			lib: ["dom", "dom.iterable", "esnext"],
			allowJs: true,
			skipLibCheck: true,
			strict: true,
			strictNullChecks: true,
			forceConsistentCasingInFileNames: true,
			noEmit: false,
			incremental: true,
			esModuleInterop: true,
			module: typescript_1.default.ModuleKind.ES2022,
			moduleResolution: typescript_1.default.ModuleResolutionKind.Node16,
			resolveJsonModule: true,
			isolatedModules: true,
			jsx: JsxEmit.ReactJSX,
			jsxImportSource: "ige-jsx"
		}
	});
	debugger;
	const result = esprima_1.default.parseModule(program.outputText);
	debugger;
};
(0, getFiles_1.getFiles)(__dirname, matchPattern, excludePattern).then((filePaths) => {
	filePaths.forEach((filePath) => {
		processFile(filePath);
	});
});
