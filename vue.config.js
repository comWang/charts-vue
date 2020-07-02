module.exports = {
    publicPath: './',
    devServer: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://server.com:3000',
                pathRewrite: {'/api': ''}
            }
        }
    },
};