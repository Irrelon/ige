const { basePath } = require("../basePath.cjs");
const path = require("path");
const fs = require("fs");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");

const plugins = [new CircularDependencyPlugin({
	// exclude detection of files based on a RegExp
	//exclude: /a\.js|node_modules/,
	// include specific files based on a RegExp
	//include: /src/,
	// add errors to webpack instead of warnings
	failOnError: true,
	// allow import cycles that include an asyncronous import,
	// e.g. via import(/* webpackMode: "weak" */ './file.js')
	allowAsyncCycles: true,
	// set the current working directory for displaying module paths
	cwd: process.cwd()
})];

// Path to the folder containing all your projects
const projectsPath = path.resolve(basePath, "examples");

// Get a list of all sub-folders (projects) in the main folder
const projects = fs.readdirSync(projectsPath).filter(item => fs.statSync(path.join(projectsPath, item)).isDirectory());
const configArr = projects.map(project => ({
	mode: "development",
	// Entry point: dynamically set based on project folder
	entry: {
		index: path.resolve(projectsPath, project, "index.js")
	},
	plugins: [],
	optimization: {
		mangleExports: false,
		moduleIds: "named",
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.server\.?$/,
				use: [
					{
						loader: "null-loader",
						options: {
							configFile: path.resolve(basePath, `./tsconfig.json`)
						}
					}
				],
				exclude: /node_modules/
			},
			// Handle our typescript tsx modules, use tsconfig-dynamic.json as the tsconfig
			{
				test: /\.ts?$/,
				use: [
					{
						loader: "ts-loader",
						options: {
							configFile: path.resolve(basePath, `./tsconfig.json`)
						}
					}
				],
				exclude: /node_modules/
			},
			// Support `import "some.module.css"` for module-scoped css (include .module.css)
			{
				test: /\.css$/,
				use: [
					"style-loader",
					{
						loader: "css-loader",
						options: {
							importLoaders: 1,
							modules: true
						}
					}
				],
				include: /\.module\.css$/
			},
			// Support `import "some.css"` for global-scoped css (exclude .module.css)
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
				exclude: /\.module\.css$/
			}
		]
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
		fallback: { http: false },
		plugins: [new TsconfigPathsPlugin()]
	},
	output: {
		// Output directory: each project will have its own output folder
		path: path.resolve(basePath, "dist/examples", project),
		filename: "[name].bundle.js"
	}
	// Add your loaders, plugins, and other configuration here
}));

module.exports = configArr;

// module.exports = {
// 	mode: "development",
// 	entry: {
// 		index: "./src/index.ts"
// 	},
// 	plugins: [],
// 	optimization: {
// 		mangleExports: false,
// 		moduleIds: "named",
// 		minimize: false
// 	},
// 	module: {
// 		rules: [
// 			{
// 				test: /\.server\.?$/,
// 				use: [
// 					{
// 						loader: "null-loader",
// 						options: {
// 							configFile: path.resolve(basePath, `./tsconfig.json`)
// 						}
// 					}
// 				],
// 				exclude: /node_modules/
// 			},
// 			// Handle our typescript tsx modules, use tsconfig-dynamic.json as the tsconfig
// 			{
// 				test: /\.ts?$/,
// 				use: [
// 					{
// 						loader: "ts-loader",
// 						options: {
// 							configFile: path.resolve(basePath, `./tsconfig.json`)
// 						}
// 					}
// 				],
// 				exclude: /node_modules/
// 			},
// 			// Support `import "some.module.css"` for module-scoped css (include .module.css)
// 			{
// 				test: /\.css$/,
// 				use: [
// 					"style-loader",
// 					{
// 						loader: "css-loader",
// 						options: {
// 							importLoaders: 1,
// 							modules: true
// 						}
// 					}
// 				],
// 				include: /\.module\.css$/
// 			},
// 			// Support `import "some.css"` for global-scoped css (exclude .module.css)
// 			{
// 				test: /\.css$/,
// 				use: ["style-loader", "css-loader"],
// 				exclude: /\.module\.css$/
// 			}
// 		]
// 	},
// 	resolve: {
// 		extensions: [".tsx", ".ts", ".js"],
// 		fallback: { http: false },
// 		plugins: [new TsconfigPathsPlugin()]
// 	},
// 	output: {
// 		filename: `[name].bundle.js`,
// 		path: path.resolve(basePath, `./dist/web/`),
// 		clean: false
// 	},
//
// 	stats: {
// 		errorDetails: true
// 	}
// };
