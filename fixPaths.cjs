/**
 * A very basic search and replace function to find import and export statements
 * in .js files where the path of the file being specified does not have a .js
 * extension and replace those paths with one that has a .js extension.
 *
 * This would be much better written using abstract source trees to do the
 * re-writing which would be "safer", however this is a fully working function
 * and doesn't seem to mess anything up at present.
 */
const { resolve } = require('path');
const { readFile, writeFile, readdir } = require('fs').promises;
const { minimatch } = require('minimatch');

const matchPattern = ["**/*.js", "**/*.jsx"];
const excludePattern = ["node_modules", "react", ".git"];

const basicImportExp = /import\s(.*)?\sfrom\s["'](((?!\.js).)*?)["'];/g;
const basicExportExp = /export\s(.*)?\sfrom\s["'](((?!\.js).)*?)["'];/g;

async function getFiles (dir, gitIgnoreArr) {
	const dirArr = await readdir(dir, { withFileTypes: true });

	const finalList = dirArr.filter((filePath) => {
		return excludePattern.every((glob) => !minimatch(filePath.name, glob));
	});

	const files = await Promise.all(finalList.map((tmpDir) => {
		const res = resolve(dir, tmpDir.name);
		return tmpDir.isDirectory() ? getFiles(res) : [res];
	})).then((results) => {
		return results.reduce((arr, item) => {
			arr.push(...item);
			return arr;
		}, []);
	});

	const finalFiles = files.filter((file) => {
		if (!file || !file.trim()) return false;
		return matchPattern.some((glob) => minimatch(file, glob));
	})

	return Array.prototype.concat(...finalFiles);
}

// Scan all folders
readFile(resolve(__dirname, ".gitignore")).then((result) => {
	return result.toString().split("\n").filter((line) => {
		return !line.startsWith("#");
	}).filter((line) => {
		return Boolean(line.trim());
	});
}).then((gitIgnoreArr) => {
	return getFiles(__dirname, gitIgnoreArr);
}).then((files) => {
	// Now scan the files for matching regular expressions
	// of imports without extensions
	files.forEach((file) => {
		readFile(file).then((fileContentsBuffer) => {
			console.log(`Processing ${file}...`);
			const fileContent = fileContentsBuffer.toString();
			let updatedContent = fileContent.replaceAll(basicImportExp, `import $1 from "$2.js";`);
			updatedContent = updatedContent.replaceAll(basicExportExp, `export $1 from "$2.js";`);

			if (fileContent === updatedContent) return;

			writeFile(file, updatedContent).then(() => {
				console.log(`Updated ${file}`);
			});
		});
	});
});
