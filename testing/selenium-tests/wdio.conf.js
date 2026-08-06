const ExcelReporter = require('./excel-reporter');

exports.config = {
    runner: 'local',
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 2,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
        }
    }],
    logLevel: 'error',
    bail: 0,
    baseUrl: process.env.WEB_APP_URL || 'http://localhost:5000',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: [
        'spec',
        [ExcelReporter, {}],
        ['junit', {
            outputDir: './reports',
            outputFileFormat: (options) => `selenium-${options.cid}.xml`
        }]
    ],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
};
