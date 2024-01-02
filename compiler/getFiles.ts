import { promises } from "fs";
import { minimatch } from "minimatch";
import { resolve } from "path";

const { readdir } = promises;

export async function getFiles (
	dir: string,
	matchPattern = ["**/*.ts", "**/*.tsx"],
	excludePattern = ["node_modules", "react", ".git"]
) {
	const dirArr = await readdir(dir, { withFileTypes: true });

	const finalList = dirArr.filter((filePath) => {
		return excludePattern.every((glob) => !minimatch(filePath.name, glob));
	});

	const files: string[] = await Promise.all(
		finalList.map((tmpDir) => {
			const res = resolve(dir, tmpDir.name);
			return tmpDir.isDirectory() ? getFiles(res, matchPattern, excludePattern) : [res];
		})
	).then((results) => {
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
