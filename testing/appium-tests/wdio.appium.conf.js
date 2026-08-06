const ExcelReporter = require('./excel-reporter');
const path = require('path');

exports.config = {
    runner: 'local',
    port: 4723,
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': process.env.CI ? 'emulator-5554' : 'KJPF8PZHAUIZR4RS',
        'appium:automationName': 'UiAutomator2',
        'appium:app': process.env.APP_PATH || path.join(process.cwd(), '..', '..', 'app.apk'),
        'appium:appWaitActivity': '*',
        'appium:noReset': false,
        'appium:fullReset': true
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 15000,
    connectionRetryTimeout: 180000,
    connectionRetryCount: 3,
    // Use the locally-installed appium binary from node_modules.
    // APPIUM_HOME is set in the workflow env to point to .appium/
    // where the UiAutomator2 driver is pre-registered.
    services: [
        ['appium', {
            command: path.join(__dirname, 'node_modules', '.bin', 'appium'),
            args: {
                relaxedSecurity: true,
                log: './appium.log',
                useDrivers: ['uiautomator2']
            }
        }]
    ],
    framework: 'mocha',
    reporters: [
        'spec',
        [ExcelReporter, {}],
        ['junit', {
            outputDir: './reports',
            outputFileFormat: (options) => `appium-${options.cid}.xml`
        }]
    ],
    mochaOpts: {
        ui: 'bdd',
        timeout: 120000
    },
};
