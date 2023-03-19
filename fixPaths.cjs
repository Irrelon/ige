/**
 * A very basic search and replace function to find import and export statements
 * in .js files where the path of the file being specified does not have a .js
 * extension and replace those paths with one that has a .js extension.
 *
 * This would be much better written using abstract source trees to do the
 * re-writing which would be "safer", however this is a fully working function
 * and doesn't seem to mess anything up at present.
 */
const chokidar = require("chokidar");
const fs = require("fs");
const { readFile, writeFile, readdir } = require("fs").promises;
const { resolve } = require("path");
const { minimatch } = require("minimatch");

const matchPattern = ["**/*.js", "**/*.jsx"];
const excludePattern = ["node_modules", "react", ".git"];

const expressions = [{
	exp: /import(.*)?["']([.]+)(((?!\.js).)*?)["'];/g,
	update: (match, isIndex) => {
		if (isIndex) {
			return `import${match[1]}"${match[2]}${match[3]}/index.js";`;
		}

		return `import${match[1]}"${match[2]}${match[3]}.js";`;
	}
}, {
	exp: /export\s(.*)?\sfrom\s["']([.]+)(((?!\.js).)*?)["'];/g,
	update: (match, isIndex) => {
		if (isIndex) {
			return `export ${match[1]} from "${match[2]}${match[3]}/index.js";`;
		}

		return `export ${match[1]} from "${match[2]}${match[3]}.js";`;
	}
}];

let tsPaths = {};
let tsResolvedPaths = {};

const readTsConfig = () => {
	const config = require("./tsconfig.json");
	tsPaths = config.compilerOptions.paths;

	Object.entries(tsPaths).forEach(([key, replacementArr]) => {
		tsResolvedPaths[key] = replacementArr.map((dir) => {
			return resolve(__dirname, dir);
		});
	});
};

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
	});

	return Array.prototype.concat(...finalFiles);
}

const processMatches = (regExp, fileFolder, content, updateFunc) => {
	let match;
	while (match = regExp.exec(content)) {
		const pathToItemFile = resolve(fileFolder, match[2] + match[3] + ".js");
		const pathToItemFolderIndexFile = resolve(fileFolder, match[2] + match[3] + "/index.js");
		let pathStatFile;
		let pathStatFolderIndexFile;

		try {
			pathStatFile = fs.lstatSync(pathToItemFile);
		} catch (err) {
			pathStatFolderIndexFile = undefined;
		}

		try {
			pathStatFolderIndexFile = fs.lstatSync(pathToItemFolderIndexFile);
		} catch (err) {
			pathStatFolderIndexFile = undefined;
		}

		if (pathStatFile) {
			// Just add .js to the end of the path
			content = content.replace(match[0], updateFunc(match, false));
		} else if (pathStatFolderIndexFile) {
			content = content.replace(match[0], updateFunc(match, true));
		}
	}

	return content;
};

const processFile = (file) => {
	if (!file) return;

	//console.log(`Processing ${file}...`);

	readFile(file).then((fileContentsBuffer) => {
		const fileFolderArr = file.split("/");
		fileFolderArr.pop();

		const fileFolder = fileFolderArr.join("/");

		const fileContent = fileContentsBuffer.toString();
		let updatedContent = fileContent;

		Object.entries(tsPaths).forEach(([key, replacementArr]) => {
			const find = key.replace("*", "");
			const replace = replacementArr[0].replace("*", "");

			const relativeSteps = new Array(file.replace(__dirname, "").split("/").length - 2).fill("../").join("");
			const replacementPath = relativeSteps + replace;

			updatedContent = updatedContent.replaceAll(find, replacementPath);
		});

		expressions.forEach((expression) => {
			updatedContent = processMatches(expression.exp, fileFolder, updatedContent, expression.update);
			expression.exp.lastIndex = 0;
		})

		if (fileContent === updatedContent) {
			//console.log(`No change ${file}`);
			return;
		}

		writeFile(file, updatedContent).then(() => {
			console.log(`Updated ${file}`);
		});
	});
};

const runSearchReplace = () => {
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
			processFile(file);
		});

		console.log(`Processed ${files.length} files`);
	});
};

readTsConfig();
runSearchReplace();

const watcher = chokidar.watch(__dirname, { persistent: true });

watcher.on("change", (filename) => {
	if (filename.indexOf("tsconfig.json") > -1) {
		console.log("Updating tsconfig.json data");
		readTsConfig();
	}
	if (!matchPattern.some((glob) => minimatch(filename, glob))) return;
	//console.log("Changed", filename);
	processFile(filename);
});
