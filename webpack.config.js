const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
	entry: './src/index.ts',
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/index.pug',
			chunks: ['index'],
		}),
		new HtmlWebpackPlugin({
			filename: 'broadcast/index.html',
			template: './src/broadcast/broadcast.pug',
			chunks: ['broadcast'],
		}),
		new HtmlWebpackPlugin({
			filename: 'lists/index.html',
			template: './src/lists/lists.pug',
			chunks: ['lists'],
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
		index: './src/index.ts',
		broadcast: './src/broadcast/broadcast.ts',
		lists: './src/lists/lists.ts',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
	}
}
