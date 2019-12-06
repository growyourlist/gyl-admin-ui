const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
	entry: './src/index.ts',
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			inject: 'body',
			template: './src/index.pug',
			chunks: ['gylBase', 'index'],
		}),
		new HtmlWebpackPlugin({
			filename: 'broadcast/index.html',
			inject: 'body',
			template: './src/broadcast/broadcast.pug',
			chunks: ['gylBase', 'broadcast'],
		}),
		new HtmlWebpackPlugin({
			filename: 'emails/index.html',
			inject: 'body',
			template: './src/emails/emails.pug',
			chunks: ['gylBase', 'emails'],
		}),
		new HtmlWebpackPlugin({
			filename: 'autoresponders/index.html',
			inject: 'body',
			template: './src/autoresponders/autoresponders.pug',
			chunks: ['gylBase', 'autoresponders'],
		}),
		new HtmlWebpackPlugin({
			filename: 'lists/index.html',
			inject: 'body',
			template: './src/lists/lists.pug',
			chunks: ['gylBase', 'lists'],
		}),
		new HtmlWebpackPlugin({
			filename: 'analytics/index.html',
			inject: 'body',
			template: './src/analytics/analytics.pug',
			chunks: ['gylBase', 'analytics'],
		}),
		new HtmlWebpackPlugin({
			filename: 'export-data/index.html',
			inject: 'body',
			template: './src/export-data/export-data.pug',
			chunks: ['gylBase', 'exportData'],
		})
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
				test: /\.scss$/i,
				use: ['style-loader', 'css-loader', 'sass-loader'],
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
				exclude: /node_modules/,
			}
		],
	},
	resolve: {
		extensions: ['.ts', '.pug', '.js', '.scss', '.css']
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
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
	}
}
