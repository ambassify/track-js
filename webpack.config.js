'use strict';

var path = require('path');
var webpack = require('webpack');

module.exports = {
    progress: !process.env.CI,

    entry: {
        track: './src/index'
    },

    output: {
        path: 'dist',
        filename: '[name].min.js',
        library: 'TrackJS',
        libraryTarget: 'umd'
    },

    module: {
        loaders: [{
            test: /\.js$/,
            exclude: path.resolve(__dirname, 'node_modules'),
            loader: 'babel'
        },
        {
            test: /node-fetch/,
            loader: 'null'
        }]
    },

    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false },
            mangle: true
        })
    ]
}
