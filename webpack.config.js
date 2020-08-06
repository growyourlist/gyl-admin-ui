require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

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
			chunks: ['gylBase', 'analytics'],
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
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
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
				use: 'html-loader',
			},
			{
				test: /\.ttf$/,
				use: 'file-loader',
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.pug', '.js', '.scss', '.css'],
	},
	entry: {
		gylBase: './src/common/gyl-base.ts',
		index: './src/index.ts',
		broadcast: './src/broadcast/broadcast.ts',
		emails: './src/emails/emails.ts',
		autoresponders: './src/autoresponders/autoresponders.ts',
		lists: './src/lists/lists.ts',
		analytics: './src/analytics/analytics.ts',
		exportData: './src/export-data/export-data.ts',
		tools: './src/tools/tools.ts',
	},
	output: {
		filename: `[name].js?v=${process.env.npm_package_version}`,
		path: path.resolve(__dirname, 'dist'),
	},
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
	},
};
