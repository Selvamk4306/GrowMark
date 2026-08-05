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
    baseUrl: 'http://localhost:5000',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: [
        'spec',
        [ExcelReporter, {}]
    ],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
