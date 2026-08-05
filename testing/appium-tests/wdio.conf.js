const ExcelReporter = require('./excel-reporter');
const path = require('path');

exports.config = {
    runner: 'local',
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['headless', 'disable-gpu']
        }
    }],
    logLevel: 'error',
    bail: 0,
    baseUrl: 'http://localhost',
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
    },
};
