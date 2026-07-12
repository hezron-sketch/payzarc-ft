const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Can't resolve 'fs'/,
        /Can't resolve 'canvas'/,
        /Can't resolve 'path'/,
        /Critical dependency/,
        /onAfterSetupMiddleware/,
        /onBeforeSetupMiddleware/,
        (warning) =>
          warning.message &&
          (warning.message.includes('face-api.js') ||
           warning.module?.resource?.includes('face-api.js'))
      ];

      return webpackConfig;
    },
  },
};