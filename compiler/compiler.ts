import { getFiles } from "./getFiles";
import { readFileSync } from "fs";
import path from "path";
import ts from "typescript";

const __dirname = path.resolve("../");

const matchPattern = ["*.tsx", "**/*.tsx"];
const excludePattern = ["node_modules", "react", ".git", "*.d.ts", "**/*.d.ts"];

const processFile = (filePath: string) => {
	const sourceFile = ts.createSourceFile(filePath, readFileSync(filePath).toString(), 9, /*setParentNodes */ true);

	debugger;
};

getFiles(__dirname, matchPattern, excludePattern).then((filePaths) => {
	filePaths.forEach((filePath) => {
		processFile(filePath);
	});
});
