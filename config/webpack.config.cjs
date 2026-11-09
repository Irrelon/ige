const { basePath } = require("../basePath.cjs");
const path = require("path");
const fs = require("fs");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { NormalModuleReplacementPlugin } = require("webpack");

const plugins = [new CircularDependencyPlugin({
	// exclude detection of files based on a RegExp
	//exclude: /a\.js|node_modules/,
	// include specific files based on a RegExp
	//include: /src/,
	// add errors to webpack instead of warnings
	failOnError: false,
	// allow import cycles that include an asynchronous import,
	// e.g. via import(/* webpackMode: "weak" */ './file.js')
	allowAsyncCycles: true,
	// set the current working directory for displaying module paths
	cwd: process.cwd()
}), new NormalModuleReplacementPlugin(/^node:/, (resource) => {
	// Jolt's multithreaded build imports Node built-ins (only used when it
	// runs under Node); strip the scheme so the fallbacks below apply
	resource.request = resource.request.replace(/^node:/, "");
}), new BundleAnalyzerPlugin({
	openAnalyzer: false,
	analyzerMode: "static"
})];

// Path to the folder containing all your projects
const projectsPath = path.resolve(basePath, "src/examples");

// Get a list of all sub-folders (projects) in the main folder
const projects = fs.readdirSync(projectsPath).filter(item => fs.statSync(path.join(projectsPath, item)).isDirectory());
// Each config is named after its example, so one can be built alone:
// npx webpack --config ./config/webpack.config.cjs --config-name zombie-game
const configArr = projects.map(project => ({
	name: project,
	mode: "development",
	target: "web",
	// Entry point: dynamically set based on project folder
	entry: {
		index: path.resolve(projectsPath, project, "index.ts")
	},
	plugins,
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
		fallback: { http: false, module: false, worker_threads: false },
		plugins: [new TsconfigPathsPlugin()]
	},
	output: {
		// Output directory: each project will have its own output folder
		path: path.resolve(basePath, "dist/esm/examples", project),
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
