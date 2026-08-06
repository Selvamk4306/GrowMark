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

    // Wait for splash screen (1.5s) + any redirect to finish before each test suite.
    // On fresh install, the app goes to language-select instead of login.
    // This hook sets the language flag and navigates to login so all tests start consistently.
    before: async function () {
        // Give the splash screen time to finish its 1.5s delay + navigation
        await browser.pause(4000);

        // If the app is on the language-select screen, press the first language option
        // to set the language and proceed to login
        try {
            const langScreen = await $('//*[@text="English"]');
            if (await langScreen.isExisting()) {
                await langScreen.click();
                await browser.pause(1000);

                // Look for a Continue/Next button if present
                const continueBtn = await $('//*[@text="Continue"]');
                if (await continueBtn.isExisting()) {
                    await continueBtn.click();
                    await browser.pause(1500);
                }
            }
        } catch (e) {
            // Not on language screen — that's fine
        }

        // Final wait for login screen to render
        await browser.pause(2000);
    },
};
