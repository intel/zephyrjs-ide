const config = {
  baseUrl: 'http://localhost:8000/',

  specs: [
    './dist/e2e/**/*.e2e-spec.js'
  ],

  exclude: [],

  // 'jasmine' by default will use the latest jasmine framework
  framework: 'jasmine',

  // allScriptsTimeout: 110000,

  jasmineNodeOpts: {
    // showTiming: true,
    showColors: true,
    isVerbose: true,
    includeStackTrace: false,
    maximumSpecCallbackDepth: 2000
    // defaultTimeoutInterval: 400000
  },

  directConnect: true,

  capabilities: {
    browserName: 'chrome',
    version: '3.24',
    'chromeOptions' : {
      args: [
        '--window-size=1024,800',
        '--enable-experimental-web-platform-features',
        '--enable-webusb'
      ]
    }
  },

  onPrepare: function() {
    browser.ignoreSynchronization = false;
  },


  /**
   * Angular 2 configuration
   *
   * useAllAngular2AppRoots: tells Protractor to wait for any angular2 apps on the page instead of just the one matching
   * `rootEl`
   */
  useAllAngular2AppRoots: true,

  plugins: [{
      package: 'protractor-console',
      logLevels: ['severe']
  }]
};

exports.config = config;
