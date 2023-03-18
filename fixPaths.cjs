const { resolve } = require('path');
const { readFile, writeFile, readdir } = require('fs').promises;
const { minimatch } = require('minimatch');

const matchPattern = ["**/*.js", "**/*.jsx"];
const excludePattern = ["node_modules", "react", ".git"];

const basicImportExp = /import\s(.*)?\sfrom\s["'](((?!\.js).)*?)["'];/g;

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
	console.log(files[0]);

	readFile(files[0]).then((fileContentsBuffer) => {
		const fileContent = fileContentsBuffer.toString();

		const updatedContent = fileContent.replaceAll(basicImportExp, `import $1 from "$2.js";`);

		writeFile(file[0], updatedContent);
	});
});


