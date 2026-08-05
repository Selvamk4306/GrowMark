const ExcelReporter = require('./excel-reporter');

exports.config = {
    runner: 'local',
    specs: [
        './specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['headless', 'disable-gpu', 'no-sandbox', 'disable-dev-shm-usage']
        }
    }],
    logLevel: 'error',
    bail: 0,
    baseUrl: process.env.WEB_APP_URL || 'http://localhost:8081',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: [
        'spec',
        [ExcelReporter, {}],
        ['junit', {
            outputDir: './reports',
            outputFileFormat: (options) => `functionality-${options.cid}.xml`
        }]
    ],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
