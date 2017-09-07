module.exports = function(webpackConfig) {
    webpackConfig.babel.plugins.push('transform-runtime');
    webpackConfig.babel.plugins.push(['import', {
      libraryName: 'antd',
        libraryDirectory: "lib",
      style: 'css',
    }]);
  
    return webpackConfig;
  };