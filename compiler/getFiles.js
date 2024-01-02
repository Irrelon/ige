"use strict";
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt (value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
					resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled (value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected (value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step (result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFiles = void 0;
const minimatch_1 = require("minimatch");
const path_1 = require("path");
const fs_1 = require("fs");
const { readdir } = fs_1.promises;
function getFiles (dir, matchPattern = ["**/*.ts", "**/*.tsx"], excludePattern = ["node_modules", "react", ".git"]) {
	return __awaiter(this, void 0, void 0, function* () {
		const dirArr = yield readdir(dir, { withFileTypes: true });
		const finalList = dirArr.filter((filePath) => {
			return excludePattern.every((glob) => !(0, minimatch_1.minimatch)(filePath.name, glob));
		});
		const files = yield Promise.all(
			finalList.map((tmpDir) => {
				const res = (0, path_1.resolve)(dir, tmpDir.name);
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
			return matchPattern.some((glob) => (0, minimatch_1.minimatch)(file, glob));
		});
		return Array.prototype.concat(...finalFiles);
	});
}
exports.getFiles = getFiles;
