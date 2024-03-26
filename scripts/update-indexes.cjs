#!/usr/bin/env node

const glob = require("glob");
const yargs = require("yargs");
const fs = require("fs");
const path = require("path");

const argv = yargs.default("src", "src/**").argv;
const ignorePatterns = ["**/node_modules/**", "**/*.old*", "**/*.test*", "**/editor/**"];

function createIndexFile (folder) {
	//console.info(`index: ${folder}`);
	const indexFile = `${folder}/exports.ts`;

	const tsFiles = glob.sync(`${folder}/*.ts`, {
		ignore: [`${folder}/exports.ts`, `${folder}/index.ts`].concat(ignorePatterns)
	});
	const tsSubFiles = glob.sync(`${folder}/*/exports.ts`, {
		ignore: ["**/node_modules/**", "**/*.old*"]
	});
	if (tsFiles.length === 0 && tsSubFiles.length === 0) {
		console.info(`No exports: ${folder}`);
		return;
	}

	let code = "";

	for (const tsFile of tsSubFiles) {
		const relativeName = path.relative(folder, tsFile);
		const parsed = path.parse(relativeName);
		const relativeNameNoExt = parsed.dir + "/" + parsed.name;
		code += `export * from "./${relativeNameNoExt}";\n`;
	}

	for (const tsFile of tsFiles) {
		const baseName = path.basename(tsFile, ".ts");
		code += `export * from "./${baseName}";\n`;
	}

	fs.writeFileSync(indexFile, code);
}

let files = glob.sync(argv.src, { ignore: ignorePatterns });
for (const folder of files) {
	console.log(`Scanning ${folder}`);
	//const rcFile = folder + ".index.json";
	// if (fs.existsSync(rcFile) == false) {
	// 	continue;
	// }
	createIndexFile(folder);
}

files = glob.sync(argv.src, { ignore: ignorePatterns });
for (const folder of files) {
	console.log(`Scanning ${folder}`);
	//const rcFile = folder + ".index.json";
	// if (fs.existsSync(rcFile) == false) {
	// 	continue;
	// }
	createIndexFile(folder);
}
