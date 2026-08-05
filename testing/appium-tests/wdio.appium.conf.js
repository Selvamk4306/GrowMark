const ExcelReporter = require('./excel-reporter');
const path = require('path');

exports.config = {
    runner: 'local',
    port: 4723, // Default Appium port
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'Android Emulator', // Update if using a physical device or specific emulator name
        'appium:automationName': 'UiAutomator2',
        // Assuming you have built an APK, replace this path with your APK path. 
        // For Expo testing, you typically build an APK using `eas build -p android --profile preview`
        'appium:app': path.join(process.cwd(), '..', '..', 'app.apk'), 
        'appium:appWaitActivity': '*', 
        'appium:noReset': false,
        'appium:fullReset': true
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
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
        timeout: 60000
    },
};
