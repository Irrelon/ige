// Bundles the Hex Realms game server (server.ts plus the simulation it runs)
// into one Node script. From the repository root:
//   npx webpack --config src/examples/hex-realms/server/webpack.server.cjs
//   node dist/hex-realms-server/server.cjs
const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const root = path.resolve(__dirname, "../../../..");

module.exports = {
	mode: "development",
	target: "node",
	devtool: "source-map",
	entry: { server: path.resolve(__dirname, "server.ts") },
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: [{ loader: "ts-loader", options: { configFile: path.resolve(root, "tsconfig.json"), transpileOnly: true } }],
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js"],
		plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(root, "tsconfig.json") })]
	},
	// Loaded from node_modules at run time (it has optional native add-ons)
	externals: { websocket: "commonjs websocket" },
	output: {
		path: path.resolve(root, "dist/hex-realms-server"),
		filename: "[name].cjs",
		library: { type: "commonjs2" }
	},
	optimization: { minimize: false }
};
