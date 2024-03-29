const fs = require('fs');
require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const package = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'package.json'))
);
const version = package.version;

if (!version) {
	throw new Error('Could not read version from package.json');
}

const baseUrl =
	process.env.NODE_ENV === 'production'
		? `${process.env.BASE_URL}/${version}`
		: process.env.BASE_URL_DEV;

module.exports = {
	entry: './src/index.ts',
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css',
			ignoreOrder: false,
		}),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			inject: 'body',
			template: './src/index.pug',
			chunks: ['gylBase', 'index'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'broadcast/index.html',
			inject: 'body',
			template: './src/broadcast/broadcast.pug',
			chunks: ['gylBase', 'broadcast'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'emails/index.html',
			inject: 'body',
			template: './src/emails/emails.pug',
			chunks: ['gylBase', 'emails'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'autoresponders/index.html',
			inject: 'body',
			template: './src/autoresponders/autoresponders.pug',
			chunks: ['gylBase', 'autoresponders'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'lists/index.html',
			inject: 'body',
			template: './src/lists/lists.pug',
			chunks: ['gylBase', 'lists'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'analytics/index.html',
			inject: 'body',
			template: './src/analytics/analytics.pug',
			chunks: ['gylBase', 'viewer'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'export-data/index.html',
			inject: 'body',
			template: './src/export-data/export-data.pug',
			chunks: ['gylBase', 'exportData'],
			templateParameters: {
				baseUrl,
			},
		}),
		new HtmlWebpackPlugin({
			filename: 'tools/index.html',
			inject: 'body',
			template: './src/tools/tools.pug',
			chunks: ['gylBase', 'tools'],
			templateParameters: {
				baseUrl,
			},
		}),
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				use: [{
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env']
					}
				}],
			},
			{
				test: /\.ts$/,
				use: [{
					loader: 'ts-loader',
					options: {
						compilerOptions: {
							declaration: false,
							target: 'es5',
							module: 'commonjs'
						},
						transpileOnly: true
					}
				}],
				exclude: /node_modules\/(?!(quill|parchment|ace-builds|mermaid)).*/,
			},
			{
				test: /\.pug$/,
				use: 'pug-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.s?css$/i,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							publicPath: '../',
						},
					},
					'css-loader',
					'sass-loader',
				],
			},
			{
				test: /\.svg$/,
				use: 'svg-inline-loader',
				exclude: /node_modules\/(?!(quill)).*/,
			},
			{
				test: /\.ttf$/,
				use: 'file-loader',
			},
		],
	},
	resolve: {
		alias: {
			'parchment': path.resolve(__dirname, 'node_modules/parchment/src/parchment.ts'),
			'quill$': path.resolve(__dirname, 'node_modules/quill/quill.js')
		},
		extensions: ['.ts', '.pug', '.js', '.scss', '.css', '.svg'],
	},
	entry: {
		gylBase: [ 'regenerator-runtime/runtime.js', './src/common/gyl-base.ts' ],
		index: [ 'regenerator-runtime/runtime.js', './src/index.ts' ],
		broadcast: [ 'regenerator-runtime/runtime.js', './src/broadcast/broadcast.ts' ],
		emails: [ 'regenerator-runtime/runtime.js', './src/emails/emails.ts' ],
		autoresponders: [ 'regenerator-runtime/runtime.js', './src/autoresponders/autoresponders.ts' ],
		lists: [ 'regenerator-runtime/runtime.js', './src/lists/lists.ts' ],
		viewer: [ 'regenerator-runtime/runtime.js', './src/analytics/viewer.ts' ],
		exportData: [ 'regenerator-runtime/runtime.js', './src/export-data/export-data.ts' ],
		tools: [ 'regenerator-runtime/runtime.js', './src/tools/tools.ts' ],
	},
	output: {
		filename: `[name].js?v=${process.env.npm_package_version}`,
		path: path.resolve(__dirname, 'dist'),
	},
	devServer: {
		static: path.join(__dirname, 'dist'),
	},
};
