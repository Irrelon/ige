import { getFiles } from "./getFiles";
import path from "path";
import ts from "typescript";
import esprima from "esprima";
var JsxEmit = ts.JsxEmit;
import { readFileSync } from "fs";
const __dirname = path.resolve("../");
const matchPattern = ["*.tsx", "**/*.tsx"];
const excludePattern = ["node_modules", "react", ".git", "*.d.ts", "**/*.d.ts"];
const processFile = (filePath) => {
    const fileContent = readFileSync(filePath).toString();
    const program = ts.transpileModule(fileContent, {
        compilerOptions: {
            "downlevelIteration": true,
            "baseUrl": ".",
            "paths": {
                "@/types/*": ["types/*"],
                "@/engine/*": ["engine/*"],
                "@/enums/*": ["enums/*"],
                "@/examples/*": ["examples/*"]
            },
            "target": ts.ScriptTarget.ES2020,
            "lib": ["dom", "dom.iterable", "esnext"],
            "allowJs": true,
            "skipLibCheck": true,
            "strict": true,
            "strictNullChecks": true,
            "forceConsistentCasingInFileNames": true,
            "noEmit": false,
            "incremental": true,
            "esModuleInterop": true,
            "module": ts.ModuleKind.ES2022,
            "moduleResolution": ts.ModuleResolutionKind.Node16,
            "resolveJsonModule": true,
            "isolatedModules": true,
            "jsx": JsxEmit.ReactJSX,
            "jsxImportSource": "ige-jsx"
        }
    });
    debugger;
    const result = esprima.parseModule(program.outputText);
    debugger;
};
getFiles(__dirname, matchPattern, excludePattern).then((filePaths) => {
    filePaths.forEach((filePath) => {
        processFile(filePath);
    });
});
