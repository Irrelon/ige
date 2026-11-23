// Node module hooks for running the engine's TypeScript straight from src
// (with --experimental-transform-types): "@/..." resolves to src, and
// imports without an extension find their .ts file.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "../../..");

function asTs (path) {
	if (/\.[cm]?[jt]s$/.test(path) && existsSync(path)) return path;
	for (const candidate of [`${path}.ts`, `${path}/index.ts`]) if (existsSync(candidate)) return candidate;
	return undefined;
}

export async function resolve (specifier, context, next) {
	let path;
	if (specifier.startsWith("@/")) {
		path = asTs(resolvePath(SRC, specifier.slice(2)));
	} else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
		path = asTs(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
	}
	return next(path ? pathToFileURL(path).href : specifier, context);
}
